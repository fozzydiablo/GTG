import * as THREE from 'three';

// Props that follow the figure's hands (barbell between hands, cable lines).
// Built once per scene, then updated each frame after pose application.

const C_METAL = 0xc8cdd9;
const C_PLATE = 0x1a1d27;
const C_CABLE = 0x6b7283;

function makeBarbell(length = 1.7) {
  const g = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: C_METAL, roughness: 0.35, metalness: 0.75 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, length, 16), barMat);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x8d95a3, roughness: 0.45, metalness: 0.7 });
  for (const sx of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12), sleeveMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = sx * (length / 2 - 0.18);
    g.add(sleeve);
  }
  const plateMat = new THREE.MeshStandardMaterial({ color: C_PLATE, roughness: 0.7 });
  for (const sx of [-1, 1]) {
    const big = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 28), plateMat);
    big.rotation.z = Math.PI / 2;
    big.position.x = sx * (length / 2 - 0.06);
    g.add(big);
    const mid = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24), plateMat);
    mid.rotation.z = Math.PI / 2;
    mid.position.x = sx * (length / 2 - 0.13);
    g.add(mid);
  }
  return g;
}

function makeCableLine() {
  const mat = new THREE.LineBasicMaterial({ color: C_CABLE });
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  return new THREE.Line(geom, mat);
}

function makeWeightPlate() {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: C_PLATE, roughness: 0.7 }),
  );
  plate.rotation.z = Math.PI / 2;
  g.add(plate);
  return g;
}

export function buildProps(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const barbell = makeBarbell(1.7);
  barbell.visible = false;
  group.add(barbell);

  const lCable = makeCableLine();
  lCable.visible = false;
  group.add(lCable);
  const rCable = makeCableLine();
  rCable.visible = false;
  group.add(rCable);

  const plate = makeWeightPlate();
  plate.visible = false;
  group.add(plate);

  return { group, barbell, lCable, rCable, plate };
}

const _vL = new THREE.Vector3();
const _vR = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _dir = new THREE.Vector3();

// Hints accepted:
//   barbell: true       — show bar between hands
//   dumbbells: true     — show dumbbells in each hand (hand-attached)
//   cables: 'overhead'  — vertical lines from each hand up to a high pulley
//   cables: 'twohand'   — two cable lines from each hand to a single high pulley point
//   plate: true         — show plate held in hands (russian twist)
//   latBar: 'show'/'hide' — show the lat bar piece on the lat station, sized between hands
export function updateProps(props, skel, hints, env) {
  // Default: hide everything
  props.barbell.visible = false;
  props.lCable.visible = false;
  props.rCable.visible = false;
  props.plate.visible = false;
  skel.lArm.dumbbell.visible = !!hints.dumbbells;
  skel.rArm.dumbbell.visible = !!hints.dumbbells;

  if (!hints.barbell && !hints.cables && !hints.plate && !hints.latBar) return;

  // Need world matrices to read hand positions.
  skel.root.updateMatrixWorld(true);
  skel.lArm.hand.getWorldPosition(_vL);
  skel.rArm.hand.getWorldPosition(_vR);

  if (hints.barbell) {
    props.barbell.visible = true;
    _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
    props.barbell.position.copy(_mid);
    _dir.copy(_vR).sub(_vL);
    if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
    _dir.normalize();
    _q.setFromUnitVectors(_xAxis, _dir);
    props.barbell.quaternion.copy(_q);
  }

  if (hints.cables === 'overhead' || hints.cables === 'twohand') {
    // Cable goes from each hand straight up to a fixed pulley point.
    const pulley = hints.pulley || new THREE.Vector3(0, 2.45, -0.5);
    for (const [cable, hand] of [[props.lCable, _vL], [props.rCable, _vR]]) {
      cable.visible = true;
      const pos = cable.geometry.attributes.position;
      pos.setXYZ(0, hand.x, hand.y, hand.z);
      pos.setXYZ(1, pulley.x, pulley.y, pulley.z);
      pos.needsUpdate = true;
      cable.geometry.computeBoundingSphere();
    }
  }

  // Lat pulldown bar: position the bar piece (which lives on the latStation)
  // to span between the user's hands.
  if (hints.latBar && env?.latStation) {
    const latBar = env.latStation.userData.latBar;
    if (latBar) {
      _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
      latBar.position.copy(env.latStation.worldToLocal(_mid.clone()));
      _dir.copy(_vR).sub(_vL);
      if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
      _dir.normalize();
      _q.setFromUnitVectors(_xAxis, _dir);
      // Apply rotation in latStation local space (latStation has no rotation, so world == local here)
      latBar.quaternion.copy(_q);
    }
  }

  if (hints.plate) {
    props.plate.visible = true;
    _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
    props.plate.position.copy(_mid);
    // Orient plate so its flat face points toward camera (+Z) by default;
    // rotate around Y by the figure's rootRotY so it twists with the torso.
    props.plate.rotation.set(0, skel.root.rotation.y, 0);
  }
}
