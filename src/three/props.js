import * as THREE from 'three';

// Props that follow the figure (barbell, cables, handles, plates).
// Built once per scene, then updated each frame after pose + IK application.
//
// Hints accepted from a rig pose:
//   barbell: true         — full barbell held between the hands
//   barbellOnBack: true   — barbell racked across the upper traps (squat)
//   barbellOnHips: true   — barbell resting on the hip crease (glute bridge)
//   dumbbells: true       — dumbbell in each hand
//   dbNeutral: true       — rotate dumbbells 90° for a neutral (hammer) grip
//   singleDB: true        — one vertical dumbbell held in both hands (overhead ext)
//   handBar: true         — short straight bar spanning the hands (pushdown/row)
//   plate: true           — weight plate held in both hands (russian twist)
//   latBar: true          — position the lat station's wide bar between hands
//   cables: 'hands'|'bar' — cable lines to hints.pulley ([x,y,z]); 'hands'
//                           draws one line per hand, 'bar' one line from the
//                           midpoint (bar attachment)
//   pulley: [x,y,z]       — cable anchor point in world space

const C_METAL = 0xc8cdd9;
const C_PLATE = 0x1a1d27;
const C_CABLE = 0x8a93a5;

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

function makeHandBar() {
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 1, 12),
    new THREE.MeshStandardMaterial({ color: C_METAL, roughness: 0.4, metalness: 0.7 }),
  );
  bar.rotation.z = Math.PI / 2; // along X, unit length → scaled per frame
  const g = new THREE.Group();
  g.add(bar);
  g.userData.bar = bar;
  return g;
}

function makeSingleDB() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.026, 0.026, 0.2, 12),
    new THREE.MeshStandardMaterial({ color: C_METAL, roughness: 0.4, metalness: 0.7 }),
  );
  g.add(handle); // handle along Y (vertical bell)
  const headMat = new THREE.MeshStandardMaterial({ color: C_PLATE, roughness: 0.7 });
  for (const sy of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), headMat);
    head.position.y = sy * 0.14;
    head.scale.set(1, 0.6, 1);
    g.add(head);
  }
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

  const handBar = makeHandBar();
  handBar.visible = false;
  group.add(handBar);

  const singleDB = makeSingleDB();
  singleDB.visible = false;
  group.add(singleDB);

  return { group, barbell, lCable, rCable, plate, handBar, singleDB };
}

const _vL = new THREE.Vector3();
const _vR = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _dir = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _off = new THREE.Vector3();

function setCable(cable, from, to) {
  cable.visible = true;
  const pos = cable.geometry.attributes.position;
  pos.setXYZ(0, from.x, from.y, from.z);
  pos.setXYZ(1, to.x, to.y, to.z);
  pos.needsUpdate = true;
  cable.geometry.computeBoundingSphere();
}

function orientBetweenHands(obj) {
  _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
  obj.position.copy(_mid);
  _dir.copy(_vR).sub(_vL);
  if (_dir.lengthSq() < 1e-6) _dir.set(1, 0, 0);
  _dir.normalize();
  _q.setFromUnitVectors(_xAxis, _dir);
  obj.quaternion.copy(_q);
}

export function updateProps(props, skel, hints, env) {
  props.barbell.visible = false;
  props.lCable.visible = false;
  props.rCable.visible = false;
  props.plate.visible = false;
  props.handBar.visible = false;
  props.singleDB.visible = false;
  skel.lArm.dumbbell.visible = !!hints.dumbbells;
  skel.rArm.dumbbell.visible = !!hints.dumbbells;
  const dbRotY = hints.dbNeutral ? Math.PI / 2 : 0;
  skel.lArm.dumbbell.rotation.y = dbRotY;
  skel.rArm.dumbbell.rotation.y = dbRotY;
  if (env?.latStation) {
    env.latStation.userData.latBar.visible = !!hints.latBar;
  }

  const needsHands = hints.barbell || hints.cables || hints.plate || hints.latBar
    || hints.handBar || hints.singleDB;
  const needsAnchor = hints.barbellOnBack || hints.barbellOnHips;
  if (!needsHands && !needsAnchor) return;

  skel.root.updateMatrixWorld(true);

  // Anchored barbell modes (bar rides on the body, not in front of hands).
  if (hints.barbellOnBack || hints.barbellOnHips) {
    props.barbell.visible = true;
    const node = hints.barbellOnBack ? skel.chest : skel.hips;
    node.getWorldPosition(_anchor);
    node.getWorldQuaternion(_q);
    _off.set(0, hints.barbellOnBack ? 0.06 : 0.1, hints.barbellOnBack ? -0.1 : 0.14)
      .applyQuaternion(_q);
    props.barbell.position.copy(_anchor).add(_off);
    props.barbell.quaternion.copy(_q);
    if (!needsHands) return;
  }

  skel.lArm.hand.getWorldPosition(_vL);
  skel.rArm.hand.getWorldPosition(_vR);

  if (hints.barbell) {
    props.barbell.visible = true;
    orientBetweenHands(props.barbell);
  }

  if (hints.handBar) {
    props.handBar.visible = true;
    orientBetweenHands(props.handBar);
    const width = Math.max(0.3, _vL.distanceTo(_vR) + 0.14);
    props.handBar.userData.bar.scale.y = width; // cylinder length axis
  }

  if (hints.singleDB) {
    props.singleDB.visible = true;
    _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
    props.singleDB.position.copy(_mid);
    props.singleDB.rotation.set(0, 0, 0);
  }

  // Lat pulldown bar: span the station's wide bar between the hands.
  if (hints.latBar && env?.latStation) {
    const latBar = env.latStation.userData.latBar;
    orientBetweenHands(latBar);
  }

  if (hints.cables && hints.pulley) {
    _anchor.set(hints.pulley[0], hints.pulley[1], hints.pulley[2]);
    if (hints.cables === 'bar') {
      _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
      setCable(props.lCable, _mid, _anchor);
    } else {
      setCable(props.lCable, _vL, _anchor);
      setCable(props.rCable, _vR, _anchor);
    }
    // Slide the adjustable pulley block to the cable anchor height.
    if (env?.cableColumn?.visible) {
      env.cableColumn.userData.pulleyBlock.position.set(
        hints.pulley[0], hints.pulley[1], hints.pulley[2] + 0.05,
      );
    }
  }

  if (hints.plate) {
    props.plate.visible = true;
    _mid.copy(_vL).add(_vR).multiplyScalar(0.5);
    props.plate.position.copy(_mid);
    props.plate.rotation.set(0, skel.root.rotation.y, 0);
  }
}
