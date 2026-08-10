import * as THREE from 'three';

// Stick figure with attached equipment props.
//
// Coordinate convention:
//   +Y up, figure faces +Z (camera side). Limbs hang along -Y at neutral.
//   Shoulder/hip "forward raise" rotates around +X.
//   Shoulder/hip "abduction" rotates around -Z (left arm) / +Z (right arm).
//   Elbow/knee bend rotates around +X (positive = bent toward chest/face).
//
// After setPose() + applyEnvironment(), call updateProps() to position
// equipment that follows the hands (barbell, dumbbells, cable lines).

const C_BONE = 0xeef1f7;
const C_JOINT = 0x7cf2c8;
const C_ACCENT = 0x62a8ff;
const C_BENCH = 0x232734;
const C_FLOOR = 0x141822;
const C_METAL = 0xc8cdd9;
const C_PLATE = 0x1a1d27;
const C_CABLE = 0x6b7283;

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

// ---------------------------------------------------------------------------
// Equipment props
// ---------------------------------------------------------------------------

function makeBarbell(length = 1.7) {
  const g = new THREE.Group();
  g.name = 'barbell';

  const barMat = new THREE.MeshStandardMaterial({ color: C_METAL, roughness: 0.35, metalness: 0.75 });
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, length, 16), barMat);
  bar.rotation.z = Math.PI / 2;
  g.add(bar);

  // Sleeves (slightly thicker, where plates sit)
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x8d95a3, roughness: 0.45, metalness: 0.7 });
  for (const sx of [-1, 1]) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 12), sleeveMat);
    sleeve.rotation.z = Math.PI / 2;
    sleeve.position.x = sx * (length / 2 - 0.18);
    g.add(sleeve);
  }

  // Plates — pair of large + small per side
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

function makeDumbbell() {
  const g = new THREE.Group();
  g.name = 'dumbbell';
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: C_METAL, roughness: 0.4, metalness: 0.7 }),
  );
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  const headMat = new THREE.MeshStandardMaterial({ color: C_PLATE, roughness: 0.7 });
  for (const sx of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10), headMat);
    head.position.x = sx * 0.12;
    head.scale.set(0.55, 1, 1);
    g.add(head);
  }
  return g;
}

function makeCableLine() {
  const mat = new THREE.LineBasicMaterial({ color: C_CABLE, linewidth: 2 });
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 1, 0),
  ]);
  return new THREE.Line(geom, mat);
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

  const lHipJoint = joint(0.07);
  lHipJoint.position.set(L.hipHalf, 0, 0);
  hips.add(lHipJoint);
  const rHipJoint = joint(0.07);
  rHipJoint.position.set(-L.hipHalf, 0, 0);
  hips.add(rHipJoint);

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
    const foot = joint(0.06, 0xf2f4f9, false);
    foot.position.y = -L.calf;
    kneeBend.add(foot);
    return { hipForward, kneeBend };
  }
  const lLeg = buildLeg(lHipJoint);
  const rLeg = buildLeg(rHipJoint);

  hips.add(joint(0.075, C_ACCENT));

  return { root, hips, spine, chest, neck, lArm, rArm, lLeg, rLeg, lengths: L };
}

// ---------------------------------------------------------------------------
// Pose application
// ---------------------------------------------------------------------------

export function setPose(skel, p) {
  const { spine, neck, lArm, rArm, lLeg, rLeg } = skel;

  // spineSide = lateral flexion (windmill, suitcase carry), spineTwist =
  // rotation about the long axis (halo, renegade row anti-rotation).
  spine.rotation.set(p.spine || 0, p.spineTwist || 0, p.spineSide || 0);
  neck.rotation.set(-(p.spine || 0) * 0.4 + (p.neck || 0), 0, -(p.spineSide || 0) * 0.5);

  lArm.shoulderAbduct.rotation.set(0, 0, -(p.lShoulderAbduct || 0));
  lArm.shoulderForward.rotation.set(p.lShoulder || 0, 0, 0);
  lArm.elbowBend.rotation.set(p.lElbow || 0, 0, 0);

  rArm.shoulderAbduct.rotation.set(0, 0, +(p.rShoulderAbduct || 0));
  rArm.shoulderForward.rotation.set(p.rShoulder || 0, 0, 0);
  rArm.elbowBend.rotation.set(p.rElbow || 0, 0, 0);

  lLeg.hipForward.rotation.set(p.lHip || 0, 0, 0);
  lLeg.kneeBend.rotation.set(-(p.lKnee || 0), 0, 0);
  rLeg.hipForward.rotation.set(p.rHip || 0, 0, 0);
  rLeg.kneeBend.rotation.set(-(p.rKnee || 0), 0, 0);
}

export function applyEnvironment(skel, p) {
  const env = {
    flatBench: false, inclineBench: false, inclineAngle: 0,
    hangBar: false, dipBars: false, latStation: false, cableColumn: false,
    floorMat: false, hideFloor: false,
  };

  skel.root.position.set(0, 0, 0);
  skel.root.rotation.set(0, p.rootRotY || 0, 0);

  if (p.lying) {
    // Supine on bench: head toward -Z, body horizontal. root.z = 1.2 puts
    // hips at world z=0; body extends head-direction toward -Z.
    skel.root.rotation.x = -Math.PI / 2;
    skel.root.position.set(0, 0.55, 1.2);
    env.flatBench = true;
  } else if (p.lyingFloor) {
    skel.root.rotation.x = -Math.PI / 2;
    skel.root.position.set(0, 0.13, 1.2);
    env.floorMat = true;
  } else if (p.plank) {
    // Prone (face down). Body lies along z-axis: root.z = -1.2 puts hips at
    // world z=0 so the body straddles the origin (head at +z, feet at -z).
    // Rig fully controls body height via rootY.
    skel.root.rotation.x = Math.PI / 2;
    skel.root.position.set(0, 0, -1.2);
    env.floorMat = true;
  } else if (p.incline) {
    // Keep figure upright; rig leans torso back via `spine` and sits via
    // hip/knee. Position so hips end up on the seat (y≈0.5) at z≈0.55.
    skel.root.position.set(0, -0.7, 0.55);
    env.inclineBench = true;
    env.inclineAngle = -Math.PI / 4;
    env.hideFloor = true;
  } else if (p.hanging) {
    // Rig fully controls body height via rootY (negative = hanging below bar).
    skel.root.position.set(0, 0, 0);
    env.hangBar = true;
    env.hideFloor = true;
  } else if (p.suspended) {
    // Rig fully controls body height via rootY.
    skel.root.position.set(0, 0, 0);
    env.dipBars = true;
    env.hideFloor = true;
  } else if (p.latSeated) {
    skel.root.position.set(0, 0.4, 0.3);
    env.latStation = true;
  } else if (p.seatedFloor) {
    skel.root.position.set(0, 0.05, 0);
    skel.root.rotation.x = -(p.spine || 0);
    env.floorMat = true;
  } else if (p.cableStanding) {
    skel.root.position.set(0, 0, 0);
    env.cableColumn = true;
  } else if (p.floorStanding) {
    // Standing on the mat (kettlebell floor work, get-ups).
    skel.root.position.set(0, 0, 0);
    env.floorMat = true;
  }

  // Rig-controlled offsets, applied on top of whatever the environment set.
  // rootZ lets standing lifts shift the hips back (squat, hinge) while the
  // feet stay planted; rootRotX pitches the whole figure (get-up).
  skel.root.position.y += (p.rootY || 0);
  skel.root.position.z += (p.rootZ || 0);
  if (p.rootRotX) skel.root.rotation.x += p.rootRotX;
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
    new THREE.BoxGeometry(1.4, 0.04, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x191d27, roughness: 0.85 }),
  );
  mat.position.y = 0.02;
  mat.visible = false;
  group.add(mat);

  // Flat bench
  const benchMat = new THREE.MeshStandardMaterial({ color: C_BENCH, roughness: 0.7 });
  const flatBench = new THREE.Group();
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 1.6), benchMat);
  pad.position.y = 0.5;
  flatBench.add(pad);
  for (const z of [0.65, -0.65]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.8 }));
    leg.position.set(0, 0.225, z);
    flatBench.add(leg);
  }
  // Uprights for the bar (at "head" end, z = -0.85)
  const uprightMat = new THREE.MeshStandardMaterial({ color: 0x3a4150, roughness: 0.7, metalness: 0.3 });
  for (const sx of [0.3, -0.3]) {
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
  // Seat under the figure's hips (which sit at y≈0.5, z≈0.55).
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.55), benchMat);
  seat.position.set(0, 0.45, 0.55);
  inclineBench.add(seat);
  // Backrest is a vertical slab; rotation tilts it backward from a hinge
  // at the back of the seat (z≈0.275, y≈0.5). Length 1.0 along Y.
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.1), benchMat);
  inclineBench.add(back);
  inclineBench.userData.back = back;
  for (const z of [0.78, 0.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.8 }));
    leg.position.set(0, 0.225, z);
    inclineBench.add(leg);
  }
  inclineBench.visible = false;
  group.add(inclineBench);

  // Pull-up bar (high horizontal bar with two posts)
  const hangBar = new THREE.Group();
  const barMat = new THREE.MeshStandardMaterial({ color: 0x9aa3b3, roughness: 0.4, metalness: 0.6 });
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

  // Lat pulldown station (cable column with high pulley + seat with thigh pad)
  const latStation = new THREE.Group();
  const column = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.7 }));
  column.position.set(0, 1.3, -0.6);
  latStation.add(column);
  const pulleyHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x3a4150, roughness: 0.6 }));
  pulleyHousing.position.set(0, 2.55, -0.5);
  latStation.add(pulleyHousing);
  // Lat seat
  const latSeat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.45), benchMat);
  latSeat.position.set(0, 0.45, 0.05);
  latStation.add(latSeat);
  // Thigh pad
  const thighPad = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.16), benchMat);
  thighPad.position.set(0, 0.78, 0.45);
  latStation.add(thighPad);
  // Wide grip lat bar (the equipment users actually hold)
  const latBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.1, 14), barMat);
  latBar.rotation.z = Math.PI / 2;
  latBar.userData.label = 'latBar';
  latStation.add(latBar);
  latStation.userData.latBar = latBar;
  latStation.visible = false;
  group.add(latStation);

  // Cable column (for triceps pushdown / cable rows) — single tall column with high pulley
  const cableColumn = new THREE.Group();
  const ccCol = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.6, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.7 }));
  ccCol.position.set(0, 1.3, -0.6);
  cableColumn.add(ccCol);
  const ccHousing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x3a4150, roughness: 0.6 }));
  ccHousing.position.set(0, 2.55, -0.5);
  cableColumn.add(ccHousing);
  cableColumn.visible = false;
  group.add(cableColumn);

  return {
    group, floor, mat, flatBench, inclineBench, hangBar, dipBars, latStation, cableColumn,
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
  env.floor.visible = !hints.hideFloor;

  if (hints.inclineBench) {
    const ang = hints.inclineAngle || -Math.PI / 4;
    const back = env.inclineBench.userData.back;
    back.rotation.x = ang;
    // Backrest is a 1.0m-tall slab. Hinge it at the seat back edge
    // (y=0.5, z=0.55). After R(ang X), the backrest's local +Y axis points
    // (0, cos ang, sin ang) in world; its center is half that length above
    // the hinge.
    back.position.set(
      0,
      0.5 + 0.5 * Math.cos(ang),
      0.55 + 0.5 * Math.sin(ang),
    );
  }
}
