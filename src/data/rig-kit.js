// ---------------------------------------------------------------------------
// Rig kit — pose math shared by every exercise animation.
// ---------------------------------------------------------------------------
//
// ROTATION CONVENTION (figure faces +Z; every limb hangs along -Y at neutral;
// all joint rotations are about +X unless noted).
//
//   spine        > 0  torso tips forward (chest toward +Z). Also tilts the arms,
//                     because the shoulders hang off the chest — see armPitch().
//   spineSide    > 0  side bend toward the figure's left (+X).
//   spineTwist   > 0  torso rotates to the left.
//   shoulder     < 0  arm swings to the front (-π/2 = horizontal, -π = overhead)
//                > 0  arm swings behind the body.
//   shoulderAbduct    with the arm OVERHEAD, positive widens the grip; with the
//                     arm HANGING, positive brings it across the body. Use a
//                     negative value to move a hanging arm away from the ribs.
//   elbow        > 0  forearm folds toward the figure's back
//                < 0  forearm folds toward the front — this is the one you want
//                     for a kettlebell rack, a clean, or anything held at the
//                     chest with the upper arm hanging.
//   hip          > 0  thigh swings behind the body; < 0 knee drives forward.
//   knee         > 0  shin swings forward of the thigh; < 0 heel toward the butt.
//   rootY/rootZ       whole-figure offset. Rigs use these to keep feet planted.
//   rootRotY/rootRotX whole-figure yaw / pitch (twists and get-ups).
//
// Nothing in here imports three.js — the rigs are plain data so the routine
// tooling and the validation script can load them in Node.

export const PI = Math.PI;

// Skeleton segment lengths. These MUST match `L` in three/stickFigure.js —
// the planted-foot maths below is derived from them.
export const SEG = {
  upperArm: 0.55,
  forearm: 0.5,
  thigh: 0.62,
  calf: 0.58,
  torso: 0.75,
  neck: 0.12,
  shoulderHalf: 0.22,
  hipHalf: 0.16,
};
SEG.hipHeight = SEG.thigh + SEG.calf;     // 1.20 — hip height when standing tall
SEG.shoulderHeight = SEG.hipHeight + SEG.torso; // 1.95
SEG.arm = SEG.upperArm + SEG.forearm;     // 1.05

// --- scalar helpers --------------------------------------------------------

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v) => clamp(v, 0, 1);

/** 0 → 1 → 0 over one loop. The default "one rep" driver. */
export const wave = (t) => 0.5 - 0.5 * Math.cos(2 * PI * t);

/** -1 → 1 → -1 over one loop, continuous (no pause at the ends). */
export const sway = (t) => Math.sin(2 * PI * t);

export const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * A snappy rep: fast concentric, slower eccentric. `up` is the fraction of the
 * loop spent lifting. Ballistic lifts (swing, snatch) use ~0.35.
 */
export function ballistic(t, up = 0.35) {
  return t < up
    ? smoothstep(t / up)
    : 1 - smoothstep((t - up) / (1 - up));
}

/** Remap a sub-range of the loop to 0..1 (0 before, 1 after). */
export function stage(t, from, to) {
  return smoothstep((t - from) / (to - from));
}

// --- pose ------------------------------------------------------------------

export const NEUTRAL = {
  spine: 0, spineSide: 0, spineTwist: 0, neck: 0,
  lShoulder: 0, rShoulder: 0,
  lShoulderAbduct: 0, rShoulderAbduct: 0,
  lElbow: 0, rElbow: 0,
  lHip: 0, rHip: 0,
  lKnee: 0, rKnee: 0,
  rootY: 0, rootZ: 0, rootRotY: 0, rootRotX: 0,
};

export function pose(overrides) {
  return { ...NEUTRAL, ...overrides };
}

/**
 * Convert a world-space arm angle into a shoulder value, cancelling out the
 * torso lean. Arms hang from the chest, so a forward hinge would otherwise
 * drag them backwards with it.
 *
 *   worldAngle:  0 = hanging straight down
 *               -π/2 = horizontal in front
 *               -π   = straight overhead
 *               +π/2 = horizontal behind
 */
export function armPitch(worldAngle, spine = 0) {
  return worldAngle - spine;
}

/**
 * Legs for any standing lift, with the feet pinned to the floor at z = 0.
 *
 *   thighFwd — angle of the thigh from vertical, positive = knee travels
 *              forward of the hip (squatting).
 *   shinFwd  — angle of the shin from vertical, positive = ankle forward of
 *              the knee. Real squats keep this slightly negative (the knee
 *              tracks over the toes).
 *
 * Returns hip/knee angles plus the rootY/rootZ that keep the feet on the
 * floor — so hips drop and travel back exactly as far as the geometry says.
 */
export function plantedLegs(thighFwd, shinFwd = 0) {
  const footZ = SEG.thigh * Math.sin(thighFwd) + SEG.calf * Math.sin(shinFwd);
  const footY = SEG.thigh * Math.cos(thighFwd) + SEG.calf * Math.cos(shinFwd);
  return {
    lHip: -thighFwd, rHip: -thighFwd,
    lKnee: -thighFwd + shinFwd, rKnee: -thighFwd + shinFwd,
    rootY: footY - SEG.hipHeight,
    rootZ: -footZ,
  };
}

/** Split stance (lunge): front leg squats, back leg trails behind. */
export function splitLegs(frontThighFwd, frontShinFwd, backThighFwd, backKnee) {
  const front = plantedLegs(frontThighFwd, frontShinFwd);
  return {
    // Left leg forward, right leg trailing.
    lHip: -frontThighFwd,
    lKnee: -frontThighFwd + frontShinFwd,
    rHip: -backThighFwd,
    rKnee: backKnee,
    rootY: front.rootY,
    rootZ: front.rootZ,
  };
}

/** A simple walk cycle for loaded carries. Feet are not pinned — it walks in place. */
export function gait(t, { stride = 0.32, bounce = 0.03 } = {}) {
  const s = sway(t) * stride;
  return {
    lHip: s, rHip: -s,
    lKnee: Math.max(0, -s) * 1.6, rKnee: Math.max(0, s) * 1.6,
    rootY: -Math.abs(Math.cos(2 * PI * t)) * bounce,
  };
}

/** Hands-on-the-floor height: how far the shoulders sit above the hands. */
export function armSpan(elbow) {
  return SEG.upperArm + SEG.forearm * Math.cos(elbow);
}

// --- keyframes -------------------------------------------------------------

/**
 * Build a rig function from keyframes. Complex lifts (clean, snatch, get-up,
 * thruster) are far easier to read as a handful of positions than as a pile of
 * lerps, and the interpolator guarantees the loop closes cleanly.
 *
 *   keyframeRig([
 *     { at: 0.0,  ...pose({ ... }) },
 *     { at: 0.45, ease: 'ballistic', ...pose({ ... }) },
 *     { at: 1.0,  ...pose({ ... }) },   // omit and frame 0 is reused
 *   ])
 *
 * Numeric fields interpolate (smoothstep by default, or linear/ballistic via
 * the destination frame's `ease`). Non-numeric fields — the equipment and
 * environment hints such as `kettlebell: 'rack'` — step to the destination
 * frame's value at the start of the segment, so props never blend into
 * nonsense mid-transition.
 */
export function keyframeRig(frames, { hold = {} } = {}) {
  const sorted = [...frames].sort((a, b) => a.at - b.at);
  if (sorted[0].at !== 0) throw new Error('keyframeRig: first frame must be at 0');
  const last = sorted[sorted.length - 1];
  if (last.at < 1) sorted.push({ ...sorted[0], at: 1 });

  const EASES = { smooth: smoothstep, linear: (x) => x, ballistic: (x) => smoothstep(x) };

  return (t) => {
    const time = clamp01(t);
    let i = 0;
    while (i < sorted.length - 2 && time > sorted[i + 1].at) i += 1;
    const a = sorted[i];
    const b = sorted[i + 1];
    const span = b.at - a.at || 1;
    const u = (EASES[b.ease] || smoothstep)(clamp01((time - a.at) / span));

    const out = { ...hold };
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (key === 'at' || key === 'ease') continue;
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') out[key] = lerp(av, bv, u);
      else out[key] = bv !== undefined ? bv : av;
    }
    return out;
  };
}

// --- generic pattern animations -------------------------------------------
//
// Imported exercises (see data/routines.js importExercises) may arrive without
// a rig — a JSON payload can't carry a function. Rather than showing an empty
// stage, every movement pattern has a plausible stand-in animation keyed off
// the pattern id, so a freshly imported exercise still renders something that
// matches its classification.

const GENERIC = {
  squat: (t) => {
    const p = wave(t);
    return pose({ ...plantedLegs(lerp(0.1, 1.35, p), lerp(-0.05, -0.3, p)), spine: lerp(0.05, 0.28, p) });
  },
  hinge: (t) => {
    const p = wave(t);
    const spine = lerp(0.05, 0.85, p);
    return pose({
      ...plantedLegs(lerp(0.05, 0.42, p), -0.08),
      spine,
      lShoulder: armPitch(0, spine), rShoulder: armPitch(0, spine),
    });
  },
  lunge: (t) => {
    const p = wave(t);
    return pose(splitLegs(lerp(0.15, 1.0, p), -0.15, lerp(-0.1, -0.55, p), lerp(-0.2, -1.6, p)));
  },
  'horizontal-press': (t) => {
    const p = wave(t);
    const e = lerp(-PI * 0.6, -PI * 0.05, p);
    return pose({ lShoulder: -PI / 2, rShoulder: -PI / 2, lElbow: e, rElbow: e });
  },
  'vertical-press': (t) => {
    const p = wave(t);
    return pose({
      lShoulder: lerp(-0.2, -PI, p), rShoulder: lerp(-0.2, -PI, p),
      lElbow: lerp(-PI * 0.85, -0.05, p), rElbow: lerp(-PI * 0.85, -0.05, p),
      lShoulderAbduct: 0.2, rShoulderAbduct: 0.2,
    });
  },
  'horizontal-pull': (t) => {
    const p = wave(t);
    return pose({
      spine: PI * 0.28,
      lShoulder: armPitch(lerp(0, 0.35, p), PI * 0.28), rShoulder: armPitch(lerp(0, 0.35, p), PI * 0.28),
      lElbow: lerp(0.05, PI * 0.8, p), rElbow: lerp(0.05, PI * 0.8, p),
      ...plantedLegs(0.3, -0.1),
    });
  },
  'vertical-pull': (t) => {
    const p = wave(t);
    return pose({
      lShoulder: -PI, rShoulder: -PI,
      lShoulderAbduct: 0.4, rShoulderAbduct: 0.4,
      lElbow: lerp(0.05, PI * 0.7, p), rElbow: lerp(0.05, PI * 0.7, p),
    });
  },
  carry: (t) => pose({ ...gait(t), spine: 0.02 }),
  rotation: (t) => pose({ rootRotY: sway(t) * 0.6, lElbow: -PI * 0.55, rElbow: -PI * 0.55, lShoulder: -0.5, rShoulder: -0.5 }),
  'anti-rotation': (t) => pose({ spineTwist: sway(t) * 0.12, lShoulder: -PI / 2, rShoulder: -PI / 2, lElbow: -0.1, rElbow: -0.1 }),
  'anti-extension': () => pose({ plank: true, forearm: true, rootY: 0.55, lShoulder: -PI / 2, rShoulder: -PI / 2, lElbow: PI / 2, rElbow: PI / 2 }),
  'trunk-flexion': (t) => pose({ lyingFloor: true, spine: lerp(0.02, PI * 0.3, wave(t)), lHip: PI / 2, rHip: PI / 2, lKnee: PI * 0.55, rKnee: PI * 0.55 }),
  'elbow-flexion': (t) => pose({ lElbow: lerp(-0.05, -PI * 0.85, wave(t)), rElbow: lerp(-0.05, -PI * 0.85, wave(t)) }),
  'elbow-extension': (t) => pose({ lElbow: lerp(-PI * 0.85, -0.05, wave(t)), rElbow: lerp(-PI * 0.85, -0.05, wave(t)) }),
  mobility: (t) => pose({ rootRotY: sway(t) * 0.4, lShoulder: -PI * 0.6, rShoulder: -PI * 0.6, lElbow: -PI * 0.5, rElbow: -PI * 0.5 }),
};

/** Stand-in animation for an exercise that arrived without its own rig. */
export function genericRig(pattern) {
  return GENERIC[pattern] || ((t) => pose({ spine: Math.sin(2 * PI * t) * 0.05 }));
}
