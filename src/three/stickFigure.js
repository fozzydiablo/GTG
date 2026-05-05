import * as THREE from 'three';

// A reusable three.js stick figure. Build a skeleton, then call setPose(pose).
// Pose fields are radians. See data/exercises.js for the rig convention.
//
// Coordinate convention:
//   +Y up, figure faces +Z (camera side). Limbs hang along -Y at neutral.
//   Shoulder/hip "forward raise" rotates around +X.
//   Shoulder/hip "abduction" rotates around -Z (left arm) / +Z (right arm).
//   Elbow/knee bend rotates around +X (positive = bent).

const C_BONE = 0xeef1f7;
const C_JOINT = 0x7cf2c8;
const C_ACCENT = 0x62a8ff;
const C_BENCH = 0x232734;
const C_FLOOR = 0x141822;

function bone(length, radius = 0.045, color = C_BONE) {
  const geom = new THREE.CylinderGeometry(radius, radius, length, 12);
  geom.translate(0, -length / 2, 0); // pivot at top
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.05 });
  return new THREE.Mesh(geom, mat);
}

function joint(radius = 0.07, color = C_JOINT) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 16, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1, emissive: color, emissiveIntensity: 0.18 }),
  );
  return m;
}

export function buildSkeleton() {
  const root = new THREE.Group();

  // Lengths (in meters-ish).
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

  // Hips group
  const hips = new THREE.Group();
  hips.position.y = L.calf + L.thigh;
  root.add(hips);

  // Spine pivot at hips, torso extends upward
  const spine = new THREE.Group();
  hips.add(spine);

  // Torso bone (drawn from spine pivot upward — flip the bone)
  const torsoBone = bone(L.torso, 0.06);
  torsoBone.rotation.z = Math.PI; // point upward
  spine.add(torsoBone);

  // Shoulders pivot at top of torso
  const chest = new THREE.Group();
  chest.position.y = L.torso;
  spine.add(chest);

  // Neck + head
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

  // Shoulders
  const lShoulderJoint = joint(0.07);
  lShoulderJoint.position.set(L.shoulderHalf, 0, 0);
  chest.add(lShoulderJoint);
  const rShoulderJoint = joint(0.07);
  rShoulderJoint.position.set(-L.shoulderHalf, 0, 0);
  chest.add(rShoulderJoint);

  // Arms
  function buildArm(parent, side /* +1 = left, -1 = right */) {
    const shoulderAbduct = new THREE.Group(); // rotate Z (abduct out to side)
    parent.add(shoulderAbduct);
    const shoulderForward = new THREE.Group(); // rotate X (forward raise)
    shoulderAbduct.add(shoulderForward);
    const upper = bone(L.upperArm);
    shoulderForward.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -L.upperArm;
    shoulderForward.add(elbow);
    const elbowJoint = joint(0.05);
    elbow.add(elbowJoint);
    const elbowBend = new THREE.Group();
    elbow.add(elbowBend);
    const fore = bone(L.forearm);
    elbowBend.add(fore);
    const hand = joint(0.06, 0xf2f4f9);
    hand.position.y = -L.forearm;
    elbowBend.add(hand);
    return { shoulderAbduct, shoulderForward, elbowBend, side };
  }
  const lArm = buildArm(lShoulderJoint, +1);
  const rArm = buildArm(rShoulderJoint, -1);

  // Hips/legs
  const lHipJoint = joint(0.07);
  lHipJoint.position.set(L.hipHalf, 0, 0);
  hips.add(lHipJoint);
  const rHipJoint = joint(0.07);
  rHipJoint.position.set(-L.hipHalf, 0, 0);
  hips.add(rHipJoint);

  function buildLeg(parent, side) {
    const hipForward = new THREE.Group(); // rotate X (forward raise)
    parent.add(hipForward);
    const thigh = bone(L.thigh);
    hipForward.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -L.thigh;
    hipForward.add(knee);
    const kneeJoint = joint(0.05);
    knee.add(kneeJoint);
    const kneeBend = new THREE.Group();
    knee.add(kneeBend);
    const calf = bone(L.calf);
    kneeBend.add(calf);
    const foot = joint(0.06, 0xf2f4f9);
    foot.position.y = -L.calf;
    kneeBend.add(foot);
    return { hipForward, kneeBend, side };
  }
  const lLeg = buildLeg(lHipJoint, +1);
  const rLeg = buildLeg(rHipJoint, -1);

  // Hip joint visual
  const hipCenter = joint(0.075, C_ACCENT);
  hips.add(hipCenter);

  return {
    root, hips, spine, chest, neck,
    lArm, rArm, lLeg, rLeg, lengths: L,
  };
}

export function setPose(skel, p) {
  const { spine, neck, lArm, rArm, lLeg, rLeg } = skel;

  // Spine forward bend (around X)
  spine.rotation.set(p.spine || 0, 0, 0);
  // Neck partly counters spine bend so head stays roughly upright.
  neck.rotation.set(-(p.spine || 0) * 0.4 + (p.neck || 0), 0, 0);

  // Arms — abduct around Z (sign depends on side), forward raise around X
  lArm.shoulderAbduct.rotation.set(0, 0, -(p.lShoulderAbduct || 0));
  lArm.shoulderForward.rotation.set(p.lShoulder || 0, 0, 0);
  lArm.elbowBend.rotation.set(p.lElbow || 0, 0, 0);

  rArm.shoulderAbduct.rotation.set(0, 0, +(p.rShoulderAbduct || 0));
  rArm.shoulderForward.rotation.set(p.rShoulder || 0, 0, 0);
  rArm.elbowBend.rotation.set(p.rElbow || 0, 0, 0);

  // Legs
  lLeg.hipForward.rotation.set(p.lHip || 0, 0, 0);
  lLeg.kneeBend.rotation.set(-(p.lKnee || 0), 0, 0);
  rLeg.hipForward.rotation.set(p.rHip || 0, 0, 0);
  rLeg.kneeBend.rotation.set(-(p.rKnee || 0), 0, 0);
  // Root pose (rotation/position) is fully owned by applyEnvironment().
}

// Apply environment pose hints (lying/plank/seated/etc.) by rotating the root.
// Returns extra props the renderer needs (e.g. show bench/floor).
export function applyEnvironment(skel, p) {
  const env = { bench: false, floor: true, hangBar: false, dipBar: false, incline: 0 };

  // Reset
  skel.root.position.set(0, 0, 0);
  skel.root.rotation.set(0, p.rootRotY || 0, 0);

  if (p.lying) {
    // Face up on a bench. -π/2 around X makes head point -Z.
    // Shift +Z so torso lies centered on bench (which is centered at z=0).
    skel.root.rotation.x = -Math.PI / 2;
    skel.root.position.set(0, 0.6, 0.7);
    env.bench = true;
  } else if (p.plank) {
    // Face down. +π/2 around X.
    skel.root.rotation.x = Math.PI / 2;
    skel.root.position.set(0, p.forearm ? 0.32 : 0.55, 0.6);
  } else if (p.incline) {
    const ang = -Math.PI / 4;
    skel.root.rotation.x = ang;
    skel.root.position.set(0, 0.55, 0.5);
    env.bench = true;
    env.incline = ang;
  } else if (p.hanging) {
    skel.root.position.set(0, 0.55, 0);
    env.hangBar = true;
  } else if (p.suspended) {
    skel.root.position.set(0, 0.65, 0);
    env.dipBar = true;
  } else if (p.seated) {
    skel.root.position.set(0, 0.05, 0);
    env.bench = true;
  }

  // Apply per-frame rootY offset on top
  skel.root.position.y += (p.rootY || 0);

  return env;
}

export function buildEnvironment(scene) {
  const group = new THREE.Group();
  scene.add(group);

  // Soft floor
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshStandardMaterial({ color: C_FLOOR, roughness: 0.95, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  group.add(floor);

  // Bench (toggled visible)
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.08, 1.6),
    new THREE.MeshStandardMaterial({ color: C_BENCH, roughness: 0.7 }),
  );
  bench.position.y = 0.5;
  bench.visible = false;
  group.add(bench);

  // Bench legs
  const benchLegMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.8 });
  const benchLegA = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.08), benchLegMat);
  benchLegA.position.set(0, 0.25, 0.7);
  benchLegA.visible = false;
  group.add(benchLegA);
  const benchLegB = benchLegA.clone();
  benchLegB.position.z = -0.7;
  group.add(benchLegB);

  // Pull-up bar
  const bar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x9aa3b3, roughness: 0.4, metalness: 0.6 }),
  );
  bar.rotation.z = Math.PI / 2;
  bar.position.y = 2.4;
  bar.visible = false;
  group.add(bar);

  // Dip bars (two parallels)
  const dipL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.0, 10),
    new THREE.MeshStandardMaterial({ color: 0x9aa3b3, roughness: 0.4, metalness: 0.6 }),
  );
  dipL.rotation.x = Math.PI / 2;
  dipL.position.set(0.32, 1.05, 0);
  dipL.visible = false;
  group.add(dipL);
  const dipR = dipL.clone();
  dipR.position.x = -0.32;
  group.add(dipR);

  return { group, bench, benchLegA, benchLegB, bar, dipL, dipR, floor };
}

export function applyEnvVisibility(env, hints) {
  env.bench.visible = !!hints.bench;
  env.benchLegA.visible = !!hints.bench;
  env.benchLegB.visible = !!hints.bench;
  env.bar.visible = !!hints.hangBar;
  env.dipL.visible = !!hints.dipBar;
  env.dipR.visible = !!hints.dipBar;

  // Tilt bench for incline
  if (hints.incline) {
    env.bench.rotation.x = hints.incline;
    env.bench.position.y = 0.55;
  } else {
    env.bench.rotation.x = 0;
    env.bench.position.y = 0.5;
  }
}
