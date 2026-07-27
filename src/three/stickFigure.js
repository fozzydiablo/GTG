import * as THREE from 'three';

// Stick figure with attached equipment props.
//
// Coordinate convention:
//   +Y up, figure faces +Z (camera side) at rootRotY = 0. Limbs hang along -Y
//   at neutral.
//   Shoulder/hip "forward raise" rotates around +X.
//   Shoulder/hip "abduction" rotates around -Z (left arm) / +Z (right arm).
//   Elbow/knee bend rotates around +X (positive = bent toward chest/face).
//   Ankle: positive = plantarflex (toes point down).
//
// Cable-machine exercises rotate the figure to face -Z (rootRotY = π) so the
// figure faces its machine, which lives at negative Z.
//
// Pose flow per frame:
//   applyEnvironment(skel, p) → setPose(skel, p) → solveArmIK (if p.ikL/ikR)
//   → updateProps(...)
//
// IK: p.ikL / p.ikR = { t: [x,y,z] world hand target, p: [x,y,z] world elbow
// hint }. The solver pins the hand exactly on the target (clamped to reach)
// and points the elbow toward the hint — this is what keeps hands ON bars.

const C_BONE = 0xeef1f7;
const C_JOINT = 0x7cf2c8;
const C_ACCENT = 0x62a8ff;
const C_BENCH = 0x232734;
const C_FLOOR = 0x141822;
const C_METAL = 0xc8cdd9;
const C_FRAME = 0x2a2f3d;
const C_FRAME2 = 0x3a4150;

function bone(length, radius = 0.045, color = C_BONE) {
  const geom = new THREE.CylinderGeometry(radius, radius, length, 12);
  geom.translate(0, -length / 2, 0); // pivot at top
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
  return new THREE.Mesh(geom, mat);
}

function joint(radius = 0.07, color = C_JOINT, emissive = true) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 12),
    new THREE.MeshStandardMaterial({
      color, roughness: 0.4, metalness: 0.1,
      emissive: emissive ? color : 0x000000,
      emissiveIntensity: emissive ? 0.18 : 0,
    }),
  );
}

function makeDumbbell() {
  const g = new THREE.Group();
  g.name = 'dumbbell';
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: C_METAL, roughness: 0.4, metalness: 0.7 }),
  );
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x1a1d27, roughness: 0.7 });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10), headMat);
    head.position.x = sx * 0.12;
    head.scale.set(0.55, 1, 1);
    g.add(head);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

export function buildSkeleton() {
  const root = new THREE.Group();

  const L = {
    upperArm: 0.55,
    forearm: 0.5,
    thigh: 0.62,
    calf: 0.58,
    torso: 0.75,
    neck: 0.12,
    shoulderHalf: 0.22,
    hipHalf: 0.16,
    footLen: 0.24,
  };
  root.userData.lengths = L;

  const hips = new THREE.Group();
  hips.position.y = L.calf + L.thigh;
  root.add(hips);

  const spine = new THREE.Group();
  hips.add(spine);

  const torsoBone = bone(L.torso, 0.06);
  torsoBone.rotation.z = Math.PI;
  spine.add(torsoBone);

  const chest = new THREE.Group();
  chest.position.y = L.torso;
  spine.add(chest);

  // Shoulder girdle (clavicle line) — gives the figure a readable torso.
  const clav = bone(L.shoulderHalf * 2, 0.038);
  clav.rotation.z = Math.PI / 2;
  clav.position.x = L.shoulderHalf;
  chest.add(clav);

  const neck = new THREE.Group();
  chest.add(neck);
  const neckBone = bone(L.neck, 0.04);
  neckBone.rotation.z = Math.PI;
  neck.add(neckBone);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2f4f9, roughness: 0.55 }),
  );
  head.position.y = L.neck + 0.13;
  neck.add(head);

  const lShoulderJoint = joint(0.07);
  lShoulderJoint.position.set(L.shoulderHalf, 0, 0);
  chest.add(lShoulderJoint);
  const rShoulderJoint = joint(0.07);
  rShoulderJoint.position.set(-L.shoulderHalf, 0, 0);
  chest.add(rShoulderJoint);

  function buildArm(parent) {
    const shoulderAbduct = new THREE.Group();
    parent.add(shoulderAbduct);
    const shoulderForward = new THREE.Group();
    shoulderAbduct.add(shoulderForward);
    const upper = bone(L.upperArm);
    shoulderForward.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -L.upperArm;
    shoulderForward.add(elbow);
    elbow.add(joint(0.05));
    const elbowBend = new THREE.Group();
    elbow.add(elbowBend);
    const fore = bone(L.forearm);
    elbowBend.add(fore);

    // Hand transform: anchor for grippable equipment.
    const hand = new THREE.Group();
    hand.position.y = -L.forearm;
    elbowBend.add(hand);
    hand.add(joint(0.06, 0xf2f4f9, false));

    // Per-hand props (start hidden)
    const dumbbell = makeDumbbell();
    dumbbell.visible = false;
    hand.add(dumbbell);

    return { shoulderAbduct, shoulderForward, elbowBend, hand, dumbbell };
  }
  const lArm = buildArm(lShoulderJoint);
  const rArm = buildArm(rShoulderJoint);

  // Pelvis girdle
  const pelvis = bone(L.hipHalf * 2, 0.05);
  pelvis.rotation.z = Math.PI / 2;
  pelvis.position.x = L.hipHalf;
  hips.add(pelvis);

  const lHipJoint = joint(0.07);
  lHipJoint.position.set(L.hipHalf, 0, 0);
  hips.add(lHipJoint);
  const rHipJoint = joint(0.07);
  rHipJoint.position.set(-L.hipHalf, 0, 0);
  hips.add(rHipJoint);

  const footMat = new THREE.MeshStandardMaterial({ color: 0xd9dde7, roughness: 0.6 });

  function buildLeg(parent) {
    const hipForward = new THREE.Group();
    parent.add(hipForward);
    const thigh = bone(L.thigh);
    hipForward.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -L.thigh;
    hipForward.add(knee);
    knee.add(joint(0.05));
    const kneeBend = new THREE.Group();
    knee.add(kneeBend);
    const calf = bone(L.calf);
    kneeBend.add(calf);
    // Ankle + foot: foot box extends forward (+Z toes) from the ankle,
    // bottom flush with y = -0.05 so a standing figure at baseline y=0.05
    // has its soles exactly on the floor.
    const ankle = new THREE.Group();
    ankle.position.y = -L.calf;
    kneeBend.add(ankle);
    ankle.add(joint(0.045, 0xf2f4f9, false));
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, L.footLen), footMat);
    foot.position.set(0, -0.028, 0.06);
    ankle.add(foot);
    return { hipForward, kneeBend, ankle, foot };
  }
  const lLeg = buildLeg(lHipJoint);
  const rLeg = buildLeg(rHipJoint);

  hips.add(joint(0.075, C_ACCENT));

  return { root, hips, spine, chest, neck, lArm, rArm, lLeg, rLeg, lengths: L };
}

// ---------------------------------------------------------------------------
// Pose application
// ---------------------------------------------------------------------------

// Sign conventions (anatomical):
//   spine        + = forward lean; spineTwist rotates the torso around its axis
//   shoulder     − = raise arm to the front (−π/2 = straight front, −π = overhead)
//   hip          + = flexion (thigh toward the chest/front)
//   knee         + = flexion (heel toward the glutes)
//   ankle        + = plantarflex (point the toes)
// Foot-flat-on-floor for an upright figure: ankle = hip − knee.
export function setPose(skel, p) {
  const { spine, neck, lArm, rArm, lLeg, rLeg } = skel;

  spine.rotation.set(p.spine || 0, p.spineTwist || 0, 0);
  neck.rotation.set(-(p.spine || 0) * 0.4 + (p.neck || 0), 0, 0);

  lArm.shoulderAbduct.rotation.set(0, 0, -(p.lShoulderAbduct || 0));
  lArm.shoulderForward.rotation.set(p.lShoulder || 0, 0, 0);
  lArm.elbowBend.rotation.set(p.lElbow || 0, 0, 0);

  rArm.shoulderAbduct.rotation.set(0, 0, +(p.rShoulderAbduct || 0));
  rArm.shoulderForward.rotation.set(p.rShoulder || 0, 0, 0);
  rArm.elbowBend.rotation.set(p.rElbow || 0, 0, 0);

  lLeg.hipForward.rotation.set(-(p.lHip || 0), 0, 0);
  lLeg.kneeBend.rotation.set(p.lKnee || 0, 0, 0);
  rLeg.hipForward.rotation.set(-(p.rHip || 0), 0, 0);
  rLeg.kneeBend.rotation.set(p.rKnee || 0, 0, 0);

  lLeg.ankle.rotation.set(p.lAnkle || 0, 0, 0);
  rLeg.ankle.rotation.set(p.rAnkle || 0, 0, 0);
}

// ---------------------------------------------------------------------------
// Two-bone arm IK — pins a hand exactly on a world-space target.
// ---------------------------------------------------------------------------

const _ikS = new THREE.Vector3();
const _ikT = new THREE.Vector3();
const _ikP = new THREE.Vector3();
const _u = new THREE.Vector3();
const _w = new THREE.Vector3();
const _eP = new THREE.Vector3();
const _ua = new THREE.Vector3();
const _fa = new THREE.Vector3();
const _n = new THREE.Vector3();
const _qp = new THREE.Quaternion();
const _m4 = new THREE.Matrix4();
const _bx = new THREE.Vector3();
const _by = new THREE.Vector3();
const _bz = new THREE.Vector3();

// side: 'l' | 'r'. target/pole: [x,y,z] world. Requires up-to-date world
// matrices (call skel.root.updateMatrixWorld(true) after setPose).
export function solveArmIK(skel, side, target, pole) {
  const arm = side === 'l' ? skel.lArm : skel.rArm;
  const L = skel.root.userData.lengths || skel.lengths;
  const a = L.upperArm, b = L.forearm;

  arm.shoulderAbduct.getWorldPosition(_ikS);
  _ikT.set(target[0], target[1], target[2]);
  _ikP.set(pole[0], pole[1], pole[2]);

  _u.copy(_ikT).sub(_ikS);
  let d = _u.length();
  d = Math.min(a + b - 1e-3, Math.max(Math.abs(a - b) + 1e-3, d));
  if (_u.lengthSq() < 1e-8) _u.set(0, -1, 0);
  _u.normalize();

  // Elbow flexion from the triangle (a, b, d).
  const cosInterior = (a * a + b * b - d * d) / (2 * a * b);
  const bendAngle = Math.PI - Math.acos(THREE.MathUtils.clamp(cosInterior, -1, 1));

  // Elbow world position: along u, offset toward the pole.
  const proj = (a * a + d * d - b * b) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - proj * proj));
  _w.copy(_ikP).sub(_ikS);
  _w.addScaledVector(_u, -_w.dot(_u));
  if (_w.lengthSq() < 1e-8) {
    // Degenerate pole: pick any perpendicular.
    _w.set(0, 0, 1).addScaledVector(_u, -_u.z);
    if (_w.lengthSq() < 1e-8) _w.set(1, 0, 0);
  }
  _w.normalize();
  _eP.copy(_ikS).addScaledVector(_u, proj).addScaledVector(_w, h);

  _ua.copy(_eP).sub(_ikS).normalize();
  _fa.copy(_ikT).sub(_eP).normalize();

  // Bend-plane normal. Positive elbow bend folds the forearm toward the
  // frame's local -Z, so (upperArm × forearm) points along local +X and the
  // frame X axis is +n.
  _n.crossVectors(_ua, _fa);
  if (_n.lengthSq() < 1e-6) _n.crossVectors(_w, _u);
  _n.normalize();

  // Express directions in the shoulder joint's local frame.
  arm.shoulderAbduct.parent.getWorldQuaternion(_qp).invert();
  _ua.applyQuaternion(_qp);
  _n.applyQuaternion(_qp);

  _by.copy(_ua).negate();            // bone points along -Y
  _bx.copy(_n);
  _bz.crossVectors(_bx, _by).normalize();
  _bx.crossVectors(_by, _bz).normalize();
  _m4.makeBasis(_bx, _by, _bz);

  arm.shoulderAbduct.rotation.set(0, 0, 0);
  arm.shoulderForward.quaternion.setFromRotationMatrix(_m4);
  arm.elbowBend.rotation.set(bendAngle, 0, 0);
}

// ---------------------------------------------------------------------------
// Environment application (per-frame figure placement)
// ---------------------------------------------------------------------------

export function applyEnvironment(skel, p) {
  const env = {
    flatBench: false, inclineBench: false, inclineAngle: 0,
    hangBar: false, dipBars: false, latStation: false, cableColumn: false,
    rowStation: false, floorMat: false, hideFloor: false,
  };

  skel.root.rotation.set(0, p.rootRotY || 0, 0);
  // Standing baseline: soles (5 cm tall feet) rest on the floor.
  skel.root.position.set(0, 0.05, 0);

  if (p.lying) {
    // Supine on bench: head toward -Z, body horizontal.
    skel.root.rotation.x = -Math.PI / 2;
    skel.root.position.set(0, 0.55, 1.2);
    env.flatBench = true;
  } else if (p.lyingFloor) {
    skel.root.rotation.x = -Math.PI / 2;
    skel.root.position.set(0, 0.13, 1.2);
    env.floorMat = true;
  } else if (p.plank) {
    // Prone. rotation π/2 puts the body face-down along +Z (head at +Z).
    // p.proneAngle inclines the body line (shoulders above ankles); the rig
    // fully controls placement via rootY (ankle height) and rootZ.
    skel.root.rotation.x = Math.PI / 2 - (p.proneAngle || 0);
    skel.root.position.set(0, 0, -1.0);
    env.floorMat = true;
  } else if (p.incline) {
    skel.root.position.set(0, -0.7, 0.55);
    env.inclineBench = true;
    env.inclineAngle = -0.62; // ~35° incline per form references
    env.hideFloor = true;
  } else if (p.hanging) {
    skel.root.position.set(0, 0, 0);
    env.hangBar = true;
    env.hideFloor = true;
  } else if (p.suspended) {
    skel.root.position.set(0, 0, 0);
    env.dipBars = true;
    env.hideFloor = true;
  } else if (p.latSeated) {
    // Facing the machine (-Z). Hips land on the seat (top ≈ 0.56).
    skel.root.position.set(0, -0.6, 0.28);
    env.latStation = true;
  } else if (p.seatedFloor) {
    // Rig positions the pelvis via rootY/rootZ and reclines via rootRotX.
    skel.root.position.set(0, 0.05, 0);
    env.floorMat = true;
  } else if (p.rowSeated) {
    // Seated on the floor facing the low pulley (-Z).
    skel.root.position.set(0, -1.11, 0.35);
    env.rowStation = true;
    env.floorMat = true;
  } else if (p.cableStanding) {
    skel.root.position.set(0, 0.05, 0.2);
    env.cableColumn = true;
  }

  if (p.rootRotX != null) skel.root.rotation.x = p.rootRotX;
  skel.root.position.y += (p.rootY || 0);
  skel.root.position.z += (p.rootZ || 0);
  return env;
}

// ---------------------------------------------------------------------------
// Static environment (built once per scene)
// ---------------------------------------------------------------------------

export function buildEnvironment(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 56),
    new THREE.MeshStandardMaterial({ color: C_FLOOR, roughness: 0.95 }),
  );
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  // Floor mat (rectangular)
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.04, 2.6),
    new THREE.MeshStandardMaterial({ color: 0x191d27, roughness: 0.85 }),
  );
  mat.position.y = 0.02;
  mat.visible = false;
  group.add(mat);

  const benchMat = new THREE.MeshStandardMaterial({ color: C_BENCH, roughness: 0.7 });
  const legMat = new THREE.MeshStandardMaterial({ color: C_FRAME, roughness: 0.8 });
  const barMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b3, roughness: 0.4, metalness: 0.6 });
  const frameMat = new THREE.MeshStandardMaterial({ color: C_FRAME, roughness: 0.7 });
  const housingMat = new THREE.MeshStandardMaterial({ color: C_FRAME2, roughness: 0.6 });

  // Flat bench
  const flatBench = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 1.6), benchMat);
  pad.position.y = 0.5;
  flatBench.add(pad);
  for (const z of [0.65, -0.65]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.06), legMat);
    leg.position.set(0, 0.225, z);
    flatBench.add(leg);
  }
  // Uprights for the bar (at "head" end, z = -0.85)
  const uprightMat = new THREE.MeshStandardMaterial({ color: C_FRAME2, roughness: 0.7, metalness: 0.3 });
  for (const sx of [0.42, -0.42]) {
    const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 12), uprightMat);
    upright.position.set(sx, 0.5, -0.85);
    flatBench.add(upright);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 16, Math.PI), uprightMat);
    hook.rotation.z = Math.PI / 2;
    hook.position.set(sx, 1.0, -0.85);
    flatBench.add(hook);
  }
  flatBench.visible = false;
  group.add(flatBench);

  // Adjustable incline bench (seat + angled backrest)
  const inclineBench = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.55), benchMat);
  seat.position.set(0, 0.45, 0.55);
  inclineBench.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.1), benchMat);
  inclineBench.add(back);
  inclineBench.userData.back = back;
  for (const z of [0.78, 0.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.06), legMat);
    leg.position.set(0, 0.225, z);
    inclineBench.add(leg);
  }
  inclineBench.visible = false;
  group.add(inclineBench);

  // Pull-up bar (high horizontal bar with two posts)
  const hangBar = new THREE.Group();
  const hangBarRod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 14), barMat);
  hangBarRod.rotation.z = Math.PI / 2;
  hangBarRod.position.y = 2.5;
  hangBar.add(hangBarRod);
  for (const sx of [-0.85, 0.85]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.5, 12), barMat);
    post.position.set(sx, 1.25, 0);
    hangBar.add(post);
  }
  hangBar.visible = false;
  group.add(hangBar);

  // Dip station: two parallel bars with vertical posts
  const dipBars = new THREE.Group();
  for (const sx of [0.35, -0.35]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 12), barMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(sx, 1.25, 0);
    dipBars.add(rod);
    for (const z of [0.4, -0.4]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 12), barMat);
      post.position.set(sx, 0.625, z);
      dipBars.add(post);
    }
  }
  dipBars.visible = false;
  group.add(dipBars);

  // Lat pulldown station — figure sits at z≈0.28 facing -Z toward the column.
  const latStation = new THREE.Group();
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18), frameMat);
  column.position.set(0, 1.3, -1.05);
  latStation.add(column);
  const pulleyHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.24), housingMat);
  pulleyHousing.position.set(0, 2.52, -0.92);
  latStation.add(pulleyHousing);
  const latSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.09, 0.5), benchMat);
  latSeat.position.set(0, 0.515, 0.3);
  latStation.add(latSeat);
  const latSeatLeg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.47, 0.08), legMat);
  latSeatLeg.position.set(0, 0.235, 0.3);
  latStation.add(latSeatLeg);
  // Thigh pad over the knees
  const thighPad = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.1, 0.2), benchMat);
  thighPad.position.set(0, 0.74, -0.24);
  latStation.add(thighPad);
  const padPost = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.6, 0.07), legMat);
  padPost.position.set(0, 0.4, -0.24);
  latStation.add(padPost);
  // Wide-grip lat bar (positioned between the hands every frame)
  const latBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.25, 14), barMat);
  latBar.rotation.z = Math.PI / 2;
  latStation.add(latBar);
  latStation.userData.latBar = latBar;
  latStation.userData.pulley = new THREE.Vector3(0, 2.44, -0.9);
  latStation.visible = false;
  group.add(latStation);

  // Cable column (pushdowns, face pulls) — column at -Z, movable pulley block.
  const cableColumn = new THREE.Group();
  const ccCol = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), frameMat);
  ccCol.position.set(0, 1.3, -0.88);
  cableColumn.add(ccCol);
  const ccTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.24), housingMat);
  ccTop.position.set(0, 2.5, -0.8);
  cableColumn.add(ccTop);
  const ccBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.6), housingMat);
  ccBase.position.set(0, 0.04, -0.8);
  cableColumn.add(ccBase);
  const pulleyBlock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.14), housingMat);
  pulleyBlock.position.set(0, 2.42, -0.76);
  cableColumn.add(pulleyBlock);
  cableColumn.userData.pulleyBlock = pulleyBlock;
  cableColumn.visible = false;
  group.add(cableColumn);

  // Seated-row station: low pulley + footplate, figure seated on the floor.
  const rowStation = new THREE.Group();
  const rowCol = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.2), frameMat);
  rowCol.position.set(0, 0.35, -1.12);
  rowStation.add(rowCol);
  const rowHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.18), housingMat);
  rowHousing.position.set(0, 0.3, -0.98);
  rowStation.add(rowHousing);
  for (const sx of [0.2, -0.2]) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.05), housingMat);
    plate.position.set(sx, 0.24, -0.78);
    plate.rotation.x = -0.35;
    rowStation.add(plate);
  }
  rowStation.userData.pulley = new THREE.Vector3(0, 0.3, -0.95);
  rowStation.visible = false;
  group.add(rowStation);

  return {
    group, floor, mat, flatBench, inclineBench, hangBar, dipBars,
    latStation, cableColumn, rowStation,
  };
}

export function applyEnvVisibility(env, hints) {
  env.mat.visible = !!hints.floorMat;
  env.flatBench.visible = !!hints.flatBench;
  env.inclineBench.visible = !!hints.inclineBench;
  env.hangBar.visible = !!hints.hangBar;
  env.dipBars.visible = !!hints.dipBars;
  env.latStation.visible = !!hints.latStation;
  env.cableColumn.visible = !!hints.cableColumn;
  env.rowStation.visible = !!hints.rowStation;
  env.floor.visible = !hints.hideFloor;

  if (hints.inclineBench) {
    const ang = hints.inclineAngle || -Math.PI / 4;
    const back = env.inclineBench.userData.back;
    back.rotation.x = ang;
    back.position.set(
      0,
      0.5 + 0.5 * Math.cos(ang),
      0.55 + 0.5 * Math.sin(ang),
    );
  }
}
