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

// Kettlebell. Built around the grip: the group's origin is the point the hand
// holds, and the bell hangs along local -Y. updateProps() then rotates that
// -Y axis to wherever the bell should point (down, overhead, along the
// forearm in the rack), so one mesh covers every kettlebell position.
function makeKettlebell() {
  const g = new THREE.Group();
  g.name = 'kettlebell';
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b3040, roughness: 0.55, metalness: 0.25 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b3, roughness: 0.4, metalness: 0.6 });

  // Handle: half-ring arching over the bell, grip at the top (the origin).
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.017, 10, 24, Math.PI), handleMat);
  handle.position.y = -0.105;
  g.add(handle);

  // Neck between handle and bell.
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.075, 0.07, 14), ironMat);
  neck.position.y = -0.135;
  g.add(neck);

  // Bell.
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), ironMat);
  bell.position.y = -0.235;
  bell.scale.set(1, 0.92, 1);
  g.add(bell);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 20), ironMat);
  base.position.y = -0.335;
  g.add(base);

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

  // Two bells: one per hand, or both parked at the same point for a
  // two-handed hold (swing, goblet, two-hand deadlift).
  const lKettlebell = makeKettlebell();
  lKettlebell.visible = false;
  group.add(lKettlebell);
  const rKettlebell = makeKettlebell();
  rKettlebell.visible = false;
  group.add(rKettlebell);

  return { group, barbell, lCable, rCable, plate, lKettlebell, rKettlebell };
}

const _vL = new THREE.Vector3();
const _vR = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _downAxis = new THREE.Vector3(0, -1, 0);
const _dir = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _bellDir = new THREE.Vector3();

// Where the bell points, given the hand and elbow world positions.
//   hang     — straight down (dead hang, goblet, bottom of a swing)
//   up       — straight up (locked out overhead)
//   arm      — continues the line of the forearm (a swing at float, a snatch)
//   rack     — folded back along the forearm, resting on it (the rack position)
function bellDirection(orient, hand, elbow, out) {
  if (orient === 'up') return out.set(0, 1, 0);
  if (orient === 'arm' || orient === 'rack') {
    out.copy(hand).sub(elbow);
    if (out.lengthSq() < 1e-6) return out.set(0, -1, 0);
    out.normalize();
    if (orient === 'rack') out.negate();
    return out;
  }
  return out.set(0, -1, 0);
}

// Hints accepted:
//   barbell: true       — show bar between hands
//   dumbbells: true     — show dumbbells in each hand (hand-attached)
//   cables: 'overhead'  — vertical lines from each hand up to a high pulley
//   cables: 'twohand'   — two cable lines from each hand to a single high pulley point
//   plate: true         — show plate held in hands (russian twist)
//   latBar: 'show'/'hide' — show the lat bar piece on the lat station, sized between hands
//   kettlebell: 'both' | 'left' | 'right' | 'each'
//                       — 'both' parks one bell between the hands; 'each' gives
//                         every hand its own; 'left'/'right' load a single side
//   kbOrient: 'hang' | 'up' | 'arm' | 'rack'  — where the bell points (per side
//                         overrides: kbOrientL / kbOrientR)
export function updateProps(props, skel, hints, env) {
  // Default: hide everything
  props.barbell.visible = false;
  props.lCable.visible = false;
  props.rCable.visible = false;
  props.plate.visible = false;
  props.lKettlebell.visible = false;
  props.rKettlebell.visible = false;
  skel.lArm.dumbbell.visible = !!hints.dumbbells;
  skel.rArm.dumbbell.visible = !!hints.dumbbells;

  if (!hints.barbell && !hints.cables && !hints.plate && !hints.latBar && !hints.kettlebell) return;

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

  if (hints.kettlebell) {
    const mode = hints.kettlebell;
    const bells = [];
    if (mode === 'both') {
      // One bell held by both hands: park it at the midpoint, and aim it with
      // whichever arm is available (the two arms are together anyway).
      _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
      skel.lArm.elbowBend.getWorldPosition(_elbow);
      bells.push([props.lKettlebell, _mid, _elbow, hints.kbOrient]);
    } else {
      if (mode === 'each' || mode === 'left') {
        skel.lArm.elbowBend.getWorldPosition(_elbow);
        bells.push([props.lKettlebell, _vL, _elbow.clone(), hints.kbOrientL || hints.kbOrient]);
      }
      if (mode === 'each' || mode === 'right') {
        skel.rArm.elbowBend.getWorldPosition(_elbow);
        bells.push([props.rKettlebell, _vR, _elbow.clone(), hints.kbOrientR || hints.kbOrient]);
      }
    }
    for (const [bell, hand, elbow, orient] of bells) {
      bell.visible = true;
      bell.position.copy(hand);
      bellDirection(orient, hand, elbow, _bellDir);
      _q.setFromUnitVectors(_downAxis, _bellDir);
      bell.quaternion.copy(_q);
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
