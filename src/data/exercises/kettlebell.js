// Kettlebell library.
//
// Kettlebells cover ground the barbell/dumbbell library doesn't: ballistic
// hip power (swing, clean, snatch), offset loading (suitcase carry, windmill),
// and long-duration grip work. That's why the taxonomy separates `pattern`
// from `loading` — a swing and a deadlift are the same hinge, loaded in two
// completely different ways, and a routine builder needs to know which.
//
// Every rig here is derived from the skeleton geometry in rig-kit.js rather
// than eyeballed: plantedLegs() keeps the feet on the floor while the hips
// travel, and armPitch() cancels the torso lean so the bell hangs under
// gravity instead of swinging with the chest.
//
// The working side for single-bell lifts is the figure's LEFT arm, which sits
// on +X — the same side the side/three-quarter cameras look from, so the bell
// is never hidden behind the torso.

import { defineExercise } from '../taxonomy.js';
import {
  PI, lerp, wave, sway, ballistic, pose, plantedLegs, splitLegs, gait,
  armPitch, keyframeRig,
} from '../rig-kit.js';

// Shared bits of geometry, so the family looks like one system.
const HIKE = {        // bottom of a swing/clean/snatch: bell hiked behind the hips
  spine: 0.95,
  thighFwd: 0.5,
  shinFwd: -0.12,
  armWorld: 0.55,
};
const RACK = {        // bell parked on the forearm at the chest
  shoulderWorld: 0.15,
  elbow: -2.35,
  abduct: 0.34,
};

// Front rack held with both hands (goblet position). The angles come from
// two-link IK on the arm: with a 0.55 upper arm and a 0.5 forearm, putting the
// hands at the sternum (y ≈ 1.62, z ≈ 0.2) needs the elbow down-and-back at
// 0.53 rad and a 2.39 rad fold. Anything looser holds the bell at arm's length.
function goblet(spine) {
  return {
    lShoulder: armPitch(0.53, spine), rShoulder: armPitch(0.53, spine),
    lShoulderAbduct: 0.3, rShoulderAbduct: 0.3,
    lElbow: -2.39, rElbow: -2.39,
    kettlebell: 'both', kbOrient: 'hang',
  };
}

export const KETTLEBELL_EXERCISES = [
  // -------------------------------------------------------------------------
  // Hinge family
  // -------------------------------------------------------------------------
  defineExercise({
    id: 'kb-deadlift',
    name: 'KB Deadlift',
    aka: ['Two-Hand Kettlebell Deadlift'],
    category: 'legs',
    pattern: 'hinge',
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell', 'barbell'],
    level: 'beginner',
    muscles: {
      primary: ['glutes', 'hamstrings'],
      secondary: ['lower-back', 'quads', 'adductors'],
      stabilizers: ['deep-core', 'abs', 'forearms', 'mid-back'],
    },
    jointActions: [
      { joint: 'hip', action: 'extension' },
      { joint: 'knee', action: 'extension' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 2, core: 3, cardio: 2, balance: 1, technical: 2, spinalLoad: 3, fatigue: 3 },
    metric: { type: 'reps', load: 'external' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 3, reps: 8, weight: 35, restSec: 90, repRange: [5, 12], tempo: '3-0-1-1', rpe: 7, frequencyPerWeek: [1, 3] },
    progression: {
      progressions: ['kb-swing', 'row'],
      variations: ['kb-goblet-squat'],
      pairsWith: ['kb-press', 'bench-press'],
    },
    cues: [
      'Bell between your feet, handle in line with your ankles.',
      'Push your hips back and let the knees bend just enough to reach — this is a hinge, not a squat.',
      'Flat back, chest proud, lats pulling the shoulders down away from your ears.',
      'Stand up by driving the floor away and squeezing the glutes at the top.',
    ],
    mistakes: [
      'Squatting the bell up with the hips low and the chest vertical.',
      'Rounding the lower back to reach the handle — raise the bell instead.',
      'Hyperextending at the top; finish with ribs down, glutes tight.',
    ],
    breathing: 'Breathe in at the top, brace, exhale as you lock out.',
    tempo: 3.0,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      const spine = lerp(0.06, 1.05, p);
      return pose({
        ...plantedLegs(lerp(0.06, 0.6, p), -0.1),
        spine,
        // Arms are ropes: cancel the torso lean so the bell hangs vertically.
        lShoulder: armPitch(0, spine), rShoulder: armPitch(0, spine),
        lShoulderAbduct: 0.13, rShoulderAbduct: 0.13,
        lElbow: -0.03, rElbow: -0.03,
        kettlebell: 'both', kbOrient: 'hang',
      });
    },
    camera: { view: 'side', position: [3.2, 1.3, 0.8], target: [0, 0.9, 0] },
  }),

  defineExercise({
    id: 'kb-swing',
    name: 'KB Swing',
    aka: ['Russian Swing', 'Two-Hand Swing'],
    category: 'ballistic',
    pattern: 'hinge',
    secondaryPatterns: ['anti-extension'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'ballistic',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'beginner',
    muscles: {
      primary: ['glutes', 'hamstrings'],
      secondary: ['lower-back', 'abs', 'quads', 'front-delts'],
      stabilizers: ['deep-core', 'forearms', 'lats'],
    },
    jointActions: [
      { joint: 'hip', action: 'extension' },
      { joint: 'knee', action: 'extension' },
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 3, core: 4, cardio: 5, balance: 2, technical: 3, spinalLoad: 3, fatigue: 4 },
    metric: { type: 'reps', load: 'external' },
    goals: ['power', 'conditioning', 'endurance'],
    programming: { sets: 5, reps: 15, weight: 35, restSec: 60, repRange: [10, 25], tempo: 'explosive', rpe: 7, frequencyPerWeek: [2, 4] },
    progression: {
      regressions: ['kb-deadlift'],
      progressions: ['kb-single-arm-swing', 'kb-snatch'],
      variations: ['kb-clean', 'kb-single-arm-swing'],
      pairsWith: ['kb-goblet-squat', 'pushup'],
    },
    cues: [
      'Hike the bell back behind your knees like a football snap — it never dips below shoulder height on the way back.',
      'Snap the hips through hard and stand tall; the arms are just ropes.',
      'The bell floats to chest height. Do not lift it with the shoulders.',
      'Let it fall, load the hips, and go straight into the next rep.',
    ],
    mistakes: [
      'Squatting the swing — bending the knees instead of hinging the hips.',
      'Lifting the bell with the arms once it passes the hips.',
      'Leaning back at the top and hanging off the lower back.',
    ],
    breathing: 'Sharp exhale at the top of every rep, inhale on the backswing.',
    contraindications: ['Acute lower-back pain', 'Untreated disc injury'],
    tempo: 1.6,
    poster: 0.42,
    rig: (t) => {
      // Fast hips, slower float: ballistic() spends 42% of the loop driving up.
      const p = ballistic(t, 0.42);
      const spine = lerp(HIKE.spine, -0.04, p);
      const arm = lerp(HIKE.armWorld, -PI / 2, p);
      return pose({
        ...plantedLegs(lerp(HIKE.thighFwd, 0.03, p), lerp(HIKE.shinFwd, -0.02, p)),
        spine,
        lShoulder: armPitch(arm, spine), rShoulder: armPitch(arm, spine),
        lShoulderAbduct: 0.12, rShoulderAbduct: 0.12,
        lElbow: -0.02, rElbow: -0.02,
        // The bell continues the line of the arms — that's what "float" is.
        kettlebell: 'both', kbOrient: 'arm',
      });
    },
    camera: { view: 'side', position: [3.6, 1.5, 0.9], target: [0, 1.1, 0] },
  }),

  defineExercise({
    id: 'kb-single-arm-swing',
    name: 'One-Arm KB Swing',
    category: 'ballistic',
    pattern: 'hinge',
    secondaryPatterns: ['anti-rotation'],
    planes: ['sagittal', 'transverse'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'unilateral',
    loading: 'ballistic',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: [],
    level: 'intermediate',
    muscles: {
      primary: ['glutes', 'hamstrings'],
      secondary: ['obliques', 'lats', 'lower-back', 'front-delts'],
      stabilizers: ['deep-core', 'forearms', 'ql'],
    },
    jointActions: [
      { joint: 'hip', action: 'extension' },
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 4, core: 5, cardio: 5, balance: 3, technical: 4, spinalLoad: 3, fatigue: 4 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['power', 'conditioning'],
    programming: { sets: 4, reps: 10, weight: 26, restSec: 60, repRange: [8, 20], tempo: 'explosive', rpe: 7, frequencyPerWeek: [1, 3] },
    progression: {
      regressions: ['kb-swing'],
      progressions: ['kb-snatch'],
      variations: ['kb-clean'],
      pairsWith: ['kb-row'],
    },
    cues: [
      'Same hinge as the two-hand swing — one hand on the horn, free arm mirroring it.',
      'Fight the rotation: shoulders stay square through the whole rep.',
      'Keep the working shoulder packed down; don\'t let the bell pull it forward.',
      'Loose grip on the handle — squeeze only when it changes direction.',
    ],
    mistakes: [
      'Letting the torso twist toward the loaded side.',
      'Death-gripping the handle and shredding your hand.',
    ],
    breathing: 'Sharp exhale at the top of every rep.',
    contraindications: ['Acute lower-back pain'],
    tempo: 1.6,
    poster: 0.42,
    rig: (t) => {
      const p = ballistic(t, 0.42);
      const spine = lerp(HIKE.spine, -0.04, p);
      const arm = lerp(HIKE.armWorld, -PI / 2, p);
      // Free arm mirrors the working arm at half amplitude and stays bent.
      const free = lerp(0.35, -0.75, p);
      return pose({
        ...plantedLegs(lerp(HIKE.thighFwd, 0.03, p), lerp(HIKE.shinFwd, -0.02, p)),
        spine,
        spineTwist: lerp(-0.06, 0.04, p),
        lShoulder: armPitch(arm, spine),
        rShoulder: armPitch(free, spine),
        lShoulderAbduct: 0.02, rShoulderAbduct: -0.22,
        lElbow: -0.02, rElbow: -0.55,
        kettlebell: 'left', kbOrient: 'arm',
      });
    },
    camera: { view: '3q', position: [2.8, 1.6, 2.2], target: [0, 1.1, 0] },
  }),

  defineExercise({
    id: 'kb-clean',
    name: 'KB Clean',
    aka: ['Single-Arm Clean'],
    category: 'ballistic',
    pattern: 'hinge',
    secondaryPatterns: ['elbow-flexion'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'unilateral',
    loading: 'ballistic',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: [],
    level: 'intermediate',
    muscles: {
      primary: ['glutes', 'hamstrings', 'upper-back'],
      secondary: ['biceps', 'forearms', 'obliques', 'front-delts'],
      stabilizers: ['deep-core', 'lats', 'ql'],
    },
    jointActions: [
      { joint: 'hip', action: 'extension' },
      { joint: 'elbow', action: 'flexion' },
      { joint: 'scapula', action: 'elevation' },
    ],
    demands: { grip: 4, core: 4, cardio: 4, balance: 3, technical: 5, spinalLoad: 3, fatigue: 4 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['power', 'skill', 'conditioning'],
    programming: { sets: 4, reps: 8, weight: 26, restSec: 75, repRange: [5, 12], tempo: 'explosive', rpe: 7, frequencyPerWeek: [1, 3] },
    progression: {
      regressions: ['kb-swing'],
      progressions: ['kb-snatch', 'kb-thruster'],
      variations: ['kb-single-arm-swing'],
      pairsWith: ['kb-press'],
    },
    cues: [
      'Hike the bell back, then guide it up close to the body — think "zip up your jacket".',
      'Spear your hand through the handle instead of letting the bell flip over your wrist.',
      'Finish with the bell resting on the forearm, elbow tight to the ribs, wrist straight.',
      'Stand tall in the rack: glutes and abs locked, bell parked, not held up by the shoulder.',
    ],
    mistakes: [
      'Letting the bell arc out wide and bang down onto the wrist.',
      'Catching with a bent wrist so the load hangs off the joint.',
      'Curling the bell up with the arm instead of using the hips.',
    ],
    breathing: 'Exhale as the bell lands in the rack.',
    tempo: 2.2,
    poster: 0.58,
    rig: keyframeRig([
      // Hike: bell behind the hips, arm long.
      {
        at: 0,
        ...pose({
          ...plantedLegs(HIKE.thighFwd, HIKE.shinFwd),
          spine: HIKE.spine,
          lShoulder: armPitch(HIKE.armWorld, HIKE.spine),
          rShoulder: armPitch(0.25, HIKE.spine),
          lShoulderAbduct: 0.02, rShoulderAbduct: -0.2,
          lElbow: -0.02, rElbow: -0.5,
          kettlebell: 'left', kbOrient: 'arm',
        }),
      },
      // Hip snap — bell accelerating up the body, elbow starting to fold.
      {
        at: 0.34,
        ease: 'ballistic',
        ...pose({
          ...plantedLegs(0.06, -0.03),
          spine: 0.04,
          lShoulder: armPitch(-0.35, 0.04),
          rShoulder: armPitch(-0.2, 0.04),
          lShoulderAbduct: 0.12, rShoulderAbduct: -0.2,
          lElbow: -1.1, rElbow: -0.5,
          kettlebell: 'left', kbOrient: 'arm',
        }),
      },
      // Racked: bell parked on the forearm at the chest.
      {
        at: 0.5,
        ...pose({
          ...plantedLegs(0.04, -0.03),
          spine: 0.02,
          lShoulder: armPitch(RACK.shoulderWorld, 0.02),
          rShoulder: 0.02,
          lShoulderAbduct: RACK.abduct, rShoulderAbduct: -0.12,
          lElbow: RACK.elbow, rElbow: -0.08,
          kettlebell: 'left', kbOrient: 'rack',
        }),
      },
      // Hold the rack, then drop back into the next hike.
      {
        at: 0.68,
        ...pose({
          ...plantedLegs(0.04, -0.03),
          spine: 0.02,
          lShoulder: armPitch(RACK.shoulderWorld, 0.02),
          rShoulder: 0.02,
          lShoulderAbduct: RACK.abduct, rShoulderAbduct: -0.12,
          lElbow: RACK.elbow, rElbow: -0.08,
          kettlebell: 'left', kbOrient: 'rack',
        }),
      },
    ]),
    camera: { view: '3q', position: [2.6, 1.7, 2.4], target: [0, 1.25, 0] },
  }),

  defineExercise({
    id: 'kb-snatch',
    name: 'KB Snatch',
    category: 'ballistic',
    pattern: 'hinge',
    secondaryPatterns: ['vertical-press'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'unilateral',
    loading: 'ballistic',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: [],
    level: 'advanced',
    muscles: {
      primary: ['glutes', 'hamstrings', 'front-delts'],
      secondary: ['upper-back', 'triceps', 'obliques', 'forearms'],
      stabilizers: ['deep-core', 'rotator-cuff', 'ql'],
    },
    jointActions: [
      { joint: 'hip', action: 'extension' },
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'elbow', action: 'extension' },
      { joint: 'scapula', action: 'upward-rotation' },
    ],
    demands: { grip: 5, core: 4, cardio: 5, balance: 4, technical: 5, spinalLoad: 3, fatigue: 5 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['power', 'conditioning', 'skill'],
    programming: { sets: 5, reps: 8, weight: 26, restSec: 90, repRange: [5, 15], tempo: 'explosive', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: {
      regressions: ['kb-single-arm-swing', 'kb-clean'],
      variations: ['kb-clean'],
      pairsWith: ['kb-suitcase-carry'],
    },
    cues: [
      'One continuous pull: hike, hip snap, and keep the bell close as it travels up.',
      'At head height, punch your hand through the handle and lock the elbow.',
      'Catch it overhead with the bell resting on the forearm — no bang.',
      'On the way down, guide the bell into the hike; don\'t let it drop straight to the floor.',
    ],
    mistakes: [
      'Muscling the bell up with the shoulder instead of the hips.',
      'Late punch-through, so the bell flips over and smashes the wrist.',
      'Overhead lockout with a soft elbow, which loads the shoulder joint.',
    ],
    breathing: 'Exhale sharply at lockout, inhale on the descent.',
    contraindications: ['Limited overhead shoulder range', 'Wrist injury'],
    tempo: 2.0,
    poster: 0.52,
    rig: keyframeRig([
      {
        at: 0,
        ...pose({
          ...plantedLegs(HIKE.thighFwd, HIKE.shinFwd),
          spine: HIKE.spine,
          lShoulder: armPitch(HIKE.armWorld, HIKE.spine),
          rShoulder: armPitch(0.25, HIKE.spine),
          lShoulderAbduct: 0.02, rShoulderAbduct: -0.2,
          lElbow: -0.02, rElbow: -0.5,
          kettlebell: 'left', kbOrient: 'arm',
        }),
      },
      // Pull: hips through, bell climbing past the chest.
      {
        at: 0.3,
        ease: 'ballistic',
        ...pose({
          ...plantedLegs(0.05, -0.03),
          spine: 0.02,
          lShoulder: armPitch(-1.15, 0.02),
          rShoulder: -0.15,
          lShoulderAbduct: 0.1, rShoulderAbduct: -0.2,
          lElbow: -0.5, rElbow: -0.45,
          kettlebell: 'left', kbOrient: 'arm',
        }),
      },
      // Lockout: arm vertical, bell resting on the back of the forearm.
      {
        at: 0.44,
        ...pose({
          ...plantedLegs(0.03, -0.02),
          spine: -0.02,
          lShoulder: -PI, rShoulder: -0.05,
          lShoulderAbduct: -0.05, rShoulderAbduct: -0.14,
          lElbow: -0.04, rElbow: -0.05,
          kettlebell: 'left', kbOrient: 'up',
        }),
      },
      {
        at: 0.62,
        ...pose({
          ...plantedLegs(0.03, -0.02),
          spine: -0.02,
          lShoulder: -PI, rShoulder: -0.05,
          lShoulderAbduct: -0.05, rShoulderAbduct: -0.14,
          lElbow: -0.04, rElbow: -0.05,
          kettlebell: 'left', kbOrient: 'up',
        }),
      },
    ]),
    camera: { view: '3q', position: [3.2, 2.3, 3.4], target: [0, 2.0, 0] },
  }),

  // -------------------------------------------------------------------------
  // Squat / lunge family
  // -------------------------------------------------------------------------
  defineExercise({
    id: 'kb-goblet-squat',
    name: 'Goblet Squat',
    category: 'legs',
    pattern: 'squat',
    secondaryPatterns: ['anti-extension'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell', 'plate'],
    level: 'beginner',
    muscles: {
      primary: ['quads', 'glutes'],
      secondary: ['adductors', 'hamstrings', 'abs', 'upper-back'],
      stabilizers: ['deep-core', 'lower-back', 'calves', 'front-delts'],
    },
    jointActions: [
      { joint: 'knee', action: 'extension' },
      { joint: 'hip', action: 'extension' },
      { joint: 'ankle', action: 'dorsiflexion' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 2, core: 4, cardio: 3, balance: 2, technical: 2, spinalLoad: 2, fatigue: 3 },
    metric: { type: 'reps', load: 'external' },
    goals: ['hypertrophy', 'strength', 'mobility'],
    programming: { sets: 3, reps: 10, weight: 35, restSec: 90, repRange: [6, 15], tempo: '3-1-1-0', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: {
      regressions: ['kb-deadlift'],
      progressions: ['kb-thruster'],
      variations: ['kb-goblet-reverse-lunge'],
      pairsWith: ['kb-row', 'pullup'],
    },
    cues: [
      'Hold the bell by the horns at chest height, elbows tucked inside your knees.',
      'Sit straight down between your hips — chest stays tall because the bell counterbalances you.',
      'Push the knees out over the toes; heels stay glued to the floor.',
      'At the bottom, pry the hips open for a second, then drive up through mid-foot.',
    ],
    mistakes: [
      'Letting the bell drift away from the chest, which drags you forward.',
      'Heels lifting — usually ankle mobility, so drop the depth until it improves.',
      'Knees collapsing inward on the way up.',
    ],
    breathing: 'Big breath at the top, hold through the bottom, exhale on the way up.',
    tempo: 2.8,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      const spine = lerp(0.06, 0.30, p);
      return pose({
        // Deep squat: thigh past horizontal, shin angled so the knee tracks
        // over the toes while the feet stay pinned at z = 0.
        ...plantedLegs(lerp(0.08, 1.45, p), lerp(-0.05, -0.35, p)),
        spine,
        ...goblet(spine),
      });
    },
    camera: { view: 'side', position: [3.2, 1.4, 1.0], target: [0, 0.95, 0] },
  }),

  defineExercise({
    id: 'kb-goblet-reverse-lunge',
    name: 'Goblet Reverse Lunge',
    category: 'legs',
    pattern: 'lunge',
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'alternating',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'intermediate',
    muscles: {
      primary: ['quads', 'glutes'],
      secondary: ['hamstrings', 'adductors', 'glute-med'],
      stabilizers: ['deep-core', 'abs', 'calves', 'ql'],
    },
    jointActions: [
      { joint: 'knee', action: 'extension' },
      { joint: 'hip', action: 'extension' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 2, core: 4, cardio: 3, balance: 4, technical: 3, spinalLoad: 2, fatigue: 3 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['hypertrophy', 'strength'],
    programming: { sets: 3, reps: 10, weight: 26, restSec: 90, repRange: [6, 12], tempo: '2-1-1-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: {
      regressions: ['kb-goblet-squat'],
      variations: ['kb-goblet-squat'],
      pairsWith: ['kb-row'],
    },
    cues: [
      'Step back, not down — the front foot never moves.',
      'Lower until the back knee kisses the floor, front shin near vertical.',
      'Keep the bell at the chest and the torso stacked; don\'t fold over the front thigh.',
      'Drive through the front heel to stand, and alternate sides each rep.',
    ],
    mistakes: [
      'Short step back, which turns it into a knee-crushing squat on one leg.',
      'Front knee caving in as you stand up.',
    ],
    breathing: 'Inhale as you step back, exhale as you drive up.',
    tempo: 3.0,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      const spine = lerp(0.06, 0.16, p);
      return pose({
        ...splitLegs(
          lerp(0.08, 0.9, p),    // front thigh
          -0.15,                 // front shin, knee slightly over the ankle
          lerp(0.08, -0.1, p),   // rear thigh swings behind
          lerp(-0.13, -0.8, p),  // rear knee folds toward the floor
        ),
        spine,
        ...goblet(spine),
      });
    },
    camera: { view: 'side', position: [3.4, 1.4, 0.6], target: [0, 0.95, 0] },
  }),

  defineExercise({
    id: 'kb-thruster',
    name: 'KB Thruster',
    aka: ['Goblet Squat to Press'],
    category: 'full-body',
    pattern: 'squat',
    secondaryPatterns: ['vertical-press'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'intermediate',
    muscles: {
      primary: ['quads', 'glutes', 'front-delts'],
      secondary: ['triceps', 'upper-back', 'abs', 'hamstrings'],
      stabilizers: ['deep-core', 'lower-back', 'calves', 'rotator-cuff'],
    },
    jointActions: [
      { joint: 'knee', action: 'extension' },
      { joint: 'hip', action: 'extension' },
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'elbow', action: 'extension' },
    ],
    demands: { grip: 3, core: 4, cardio: 5, balance: 3, technical: 3, spinalLoad: 3, fatigue: 5 },
    metric: { type: 'reps', load: 'external' },
    goals: ['conditioning', 'power', 'hypertrophy'],
    programming: { sets: 4, reps: 10, weight: 26, restSec: 75, repRange: [6, 15], tempo: '2-0-1-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: {
      regressions: ['kb-goblet-squat', 'kb-press'],
      variations: ['kb-clean', 'overhead-press'],
      pairsWith: ['kb-row'],
    },
    cues: [
      'Front squat with the bell at the chest, then use the leg drive to launch it overhead.',
      'One movement: the press starts before the legs finish, not after.',
      'Lock out with the biceps by the ears and ribs down.',
      'Absorb the bell back into the chest and go straight into the next squat.',
    ],
    mistakes: [
      'Pausing at the top of the squat, which kills the leg drive.',
      'Pressing with the lower back arched instead of the glutes locked.',
    ],
    breathing: 'Inhale into the squat, exhale hard as you punch overhead.',
    contraindications: ['Limited overhead shoulder range'],
    tempo: 2.6,
    poster: 0.58,
    rig: keyframeRig([
      // Rack at the chest.
      { at: 0, ...pose({ ...plantedLegs(0.08, -0.05), spine: 0.06, ...goblet(0.06) }) },
      // Bottom of the front squat.
      { at: 0.32, ...pose({ ...plantedLegs(1.4, -0.32), spine: 0.28, ...goblet(0.28) }) },
      // Drive out and punch overhead.
      {
        at: 0.58,
        ease: 'ballistic',
        ...pose({
          ...plantedLegs(0.04, -0.02),
          spine: -0.04,
          lShoulder: -PI, rShoulder: -PI,
          // Overhead, a negative abduct pulls the arms toward the midline so
          // both hands meet on the one handle.
          lShoulderAbduct: -0.21, rShoulderAbduct: -0.21,
          lElbow: -0.08, rElbow: -0.08,
          kettlebell: 'both', kbOrient: 'up',
        }),
      },
      // Back to the rack.
      { at: 0.78, ...pose({ ...plantedLegs(0.08, -0.05), spine: 0.06, ...goblet(0.06) }) },
    ]),
    camera: { view: '3q', position: [3.2, 2.2, 3.4], target: [0, 1.85, 0] },
  }),

  // -------------------------------------------------------------------------
  // Press / pull family
  // -------------------------------------------------------------------------
  defineExercise({
    id: 'kb-press',
    name: 'KB Overhead Press',
    aka: ['Strict Kettlebell Press'],
    category: 'push',
    pattern: 'vertical-press',
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'unilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'beginner',
    muscles: {
      primary: ['front-delts', 'triceps'],
      secondary: ['side-delts', 'upper-chest', 'upper-back', 'serratus'],
      stabilizers: ['obliques', 'deep-core', 'glutes', 'rotator-cuff', 'forearms'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'elbow', action: 'extension' },
      { joint: 'scapula', action: 'upward-rotation' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 3, core: 4, cardio: 2, balance: 3, technical: 3, spinalLoad: 2, fatigue: 3 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 4, reps: 6, weight: 26, restSec: 120, repRange: [3, 10], tempo: '2-1-1-1', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: {
      regressions: ['kb-floor-press'],
      progressions: ['overhead-press', 'kb-thruster'],
      variations: ['overhead-press'],
      pairsWith: ['pullup', 'kb-row'],
    },
    cues: [
      'Start in a solid rack: bell on the forearm, elbow tight to the ribs, wrist straight.',
      'Squeeze the same-side glute and brace the abs — that\'s your platform.',
      'Press around your head, not in front of it, then finish with the biceps by the ear.',
      'Pull the bell back down into the rack rather than letting it fall.',
    ],
    mistakes: [
      'Leaning away from the bell instead of bracing under it.',
      'Broken wrist at lockout — the forearm and hand should be one line.',
      'Shrugging the bell up rather than pressing and rotating the shoulder blade.',
    ],
    breathing: 'Inhale in the rack, brace, exhale at lockout.',
    contraindications: ['Limited overhead shoulder range'],
    tempo: 2.4,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      // Rack (p = 0) → overhead lockout (p = 1).
      const shoulder = lerp(armPitch(RACK.shoulderWorld, 0), -PI, p);
      const elbow = lerp(RACK.elbow, -0.05, p);
      return pose({
        ...plantedLegs(0.04, -0.03),
        spine: 0.02,
        spineSide: lerp(0.05, 0.0, p),
        lShoulder: shoulder,
        lShoulderAbduct: lerp(RACK.abduct, -0.05, p),
        lElbow: elbow,
        // Free arm hangs, slightly away from the ribs.
        rShoulder: 0.02, rShoulderAbduct: -0.16, rElbow: -0.06,
        kettlebell: 'left',
        // On the forearm in the rack, stacked over the hand at lockout.
        kbOrient: p > 0.55 ? 'up' : 'rack',
      });
    },
    camera: { view: '3q', position: [3.0, 2.3, 3.2], target: [0, 1.95, 0] },
  }),

  defineExercise({
    id: 'kb-row',
    name: 'Single-Arm KB Row',
    category: 'pull',
    pattern: 'horizontal-pull',
    secondaryPatterns: ['anti-rotation'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'unilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'beginner',
    muscles: {
      primary: ['lats', 'mid-back', 'biceps'],
      secondary: ['rear-delts', 'upper-back', 'brachialis', 'obliques'],
      stabilizers: ['lower-back', 'hamstrings', 'glutes', 'forearms', 'deep-core'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'extension' },
      { joint: 'elbow', action: 'flexion' },
      { joint: 'scapula', action: 'retraction' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 3, core: 3, cardio: 2, balance: 2, technical: 2, spinalLoad: 3, fatigue: 3 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['hypertrophy', 'strength'],
    programming: { sets: 3, reps: 10, weight: 35, restSec: 75, repRange: [6, 15], tempo: '2-1-2-1', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: {
      progressions: ['row', 'pullup'],
      variations: ['row', 'kb-renegade-row'],
      pairsWith: ['kb-press', 'bench-press'],
    },
    cues: [
      'Hinge to about 45°, free hand braced on your thigh or a bench.',
      'Start with the arm long and the shoulder blade stretched forward.',
      'Row the bell to your hip pocket, elbow close to the ribs.',
      'Squeeze for a beat at the top, then lower all the way to a full stretch.',
    ],
    mistakes: [
      'Rowing to the armpit with a flared elbow, which turns it into a rear-delt raise.',
      'Twisting the torso open to lift heavier.',
      'Shrugging the shoulder toward the ear instead of pulling the blade back.',
    ],
    breathing: 'Exhale as you row, inhale on the stretch.',
    tempo: 2.4,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      const spine = 0.94;
      return pose({
        ...plantedLegs(0.3, -0.12),
        spine,
        spineTwist: lerp(0, 0.07, p),
        // Working arm hangs plumb, then the elbow drives up along the ribs.
        lShoulder: armPitch(lerp(0, 0.22, p), spine),
        lShoulderAbduct: 0.02,
        lElbow: lerp(0.05, 1.5, p),
        // Free arm braced forward on the thigh.
        rShoulder: armPitch(-0.35, spine), rShoulderAbduct: -0.1, rElbow: 0.55,
        kettlebell: 'left', kbOrient: 'hang',
      });
    },
    camera: { view: '3q', position: [3.0, 1.5, 1.9], target: [0, 1.0, 0] },
  }),

  defineExercise({
    id: 'kb-renegade-row',
    name: 'Renegade Row',
    category: 'core',
    pattern: 'anti-rotation',
    secondaryPatterns: ['horizontal-pull', 'anti-extension'],
    planes: ['sagittal', 'transverse'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'alternating',
    loading: 'grind',
    setup: 'floor-prone',
    equipment: ['kettlebell', 'mat'],
    equipmentAlt: ['dumbbell'],
    level: 'advanced',
    muscles: {
      primary: ['abs', 'obliques', 'lats'],
      secondary: ['mid-back', 'biceps', 'rear-delts', 'deep-core'],
      stabilizers: ['glutes', 'quads', 'serratus', 'forearms', 'rotator-cuff'],
    },
    jointActions: [
      { joint: 'spine', action: 'isometric' },
      { joint: 'shoulder', action: 'extension' },
      { joint: 'elbow', action: 'flexion' },
      { joint: 'scapula', action: 'retraction' },
    ],
    demands: { grip: 4, core: 5, cardio: 3, balance: 4, technical: 4, spinalLoad: 2, fatigue: 4 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['strength', 'endurance'],
    programming: { sets: 3, reps: 8, weight: 26, restSec: 90, repRange: [5, 12], tempo: '2-1-2-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: {
      regressions: ['plank', 'kb-row'],
      variations: ['kb-row'],
      pairsWith: ['kb-goblet-squat'],
    },
    cues: [
      'Plank on the bell handles, feet wider than usual for a stable base.',
      'Squeeze glutes and abs so the hips never rotate — that\'s the whole exercise.',
      'Row one bell to the hip while the other side pushes hard into the floor.',
      'Set it down quietly before switching sides.',
    ],
    mistakes: [
      'Hips twisting toward the rowing side.',
      'Round-handled bells rolling — use flat-based bells and a stable floor.',
      'Rowing so heavy the plank collapses.',
    ],
    breathing: 'Exhale on the row, keep the brace the entire set.',
    contraindications: ['Wrist pain in extension'],
    tempo: 2.8,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      // Hands rest on the handles (~0.3 above the floor), body held rigid.
      return pose({
        plank: true,
        rootY: 1.05 + 0.3,
        spineTwist: lerp(0, 0.09, p),
        // Support arm locked out.
        rShoulder: -PI / 2, rShoulderAbduct: 0.2, rElbow: 0,
        // Working arm rows. Face down, the body's -Y is toward the feet and
        // its -Z is toward the ceiling, so a positive shoulder swings the
        // elbow up and back while the elbow fold drops the forearm vertical —
        // elbow high, hand tucked under it at the ribs.
        lShoulder: lerp(-PI / 2, 0.6, p),
        lShoulderAbduct: 0.2,
        lElbow: lerp(0, -2.2, p),
        lHip: 0, rHip: 0, lKnee: 0, rKnee: 0,
        kettlebell: 'each', kbOrient: 'hang',
      });
    },
    camera: { view: '3q', position: [2.6, 1.9, 2.2], target: [0, 0.75, 0] },
  }),

  defineExercise({
    id: 'kb-floor-press',
    name: 'KB Floor Press',
    category: 'push',
    pattern: 'horizontal-press',
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'floor-supine',
    equipment: ['kettlebell', 'mat'],
    equipmentAlt: ['dumbbell'],
    level: 'beginner',
    muscles: {
      primary: ['chest', 'triceps'],
      secondary: ['front-delts', 'serratus'],
      stabilizers: ['abs', 'lats', 'rotator-cuff', 'forearms'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'horizontal-adduction' },
      { joint: 'elbow', action: 'extension' },
    ],
    demands: { grip: 3, core: 3, cardio: 2, balance: 2, technical: 2, spinalLoad: 1, fatigue: 3 },
    metric: { type: 'reps', load: 'external' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 3, reps: 8, weight: 35, restSec: 90, repRange: [5, 12], tempo: '3-1-1-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: {
      progressions: ['bench-press', 'kb-press'],
      variations: ['bench-press', 'pushup'],
      pairsWith: ['kb-row'],
    },
    cues: [
      'Lie on your back, one knee bent with the foot planted, other leg long.',
      'Bells stacked over the shoulders, wrists straight, knuckles to the ceiling.',
      'Lower until the triceps touch the floor — the floor is your depth stop.',
      'Pause on the floor, then press without bouncing off your elbows.',
    ],
    mistakes: [
      'Flaring the elbows to 90°, which grinds the shoulder.',
      'Bouncing the triceps off the floor to get out of the bottom.',
    ],
    breathing: 'Inhale down, brace on the floor, exhale as you press.',
    tempo: 2.8,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      const elbow = lerp(PI * 0.42, PI * 0.04, p);
      const abduct = lerp(0.48, 0.3, p);
      return pose({
        lyingFloor: true,
        lShoulder: -PI / 2, rShoulder: -PI / 2,
        lShoulderAbduct: abduct, rShoulderAbduct: abduct,
        lElbow: elbow, rElbow: elbow,
        // One knee up with the foot planted, the other leg flat on the floor.
        lHip: -1.2, lKnee: -2.27,
        rHip: 0, rKnee: -0.05,
        kettlebell: 'each', kbOrient: 'up',
      });
    },
    camera: { view: 'side', position: [3.0, 1.4, 0.4], target: [0, 0.55, 0] },
  }),

  // -------------------------------------------------------------------------
  // Core / positional family
  // -------------------------------------------------------------------------
  defineExercise({
    id: 'kb-halo',
    name: 'KB Halo',
    category: 'mobility',
    pattern: 'mobility',
    secondaryPatterns: ['anti-extension'],
    planes: ['transverse', 'frontal'],
    force: 'mixed',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'alternating',
    loading: 'flow',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['plate'],
    level: 'beginner',
    muscles: {
      primary: ['side-delts', 'rotator-cuff'],
      secondary: ['upper-back', 'triceps', 'front-delts'],
      stabilizers: ['abs', 'deep-core', 'obliques'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'external-rotation' },
      { joint: 'shoulder', action: 'abduction' },
      { joint: 'scapula', action: 'upward-rotation' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 2, core: 3, cardio: 2, balance: 2, technical: 2, spinalLoad: 1, fatigue: 2 },
    metric: { type: 'reps', load: 'external' },
    goals: ['mobility', 'skill'],
    programming: { sets: 2, reps: 8, weight: 18, restSec: 45, repRange: [5, 10], tempo: 'slow', rpe: 5, frequencyPerWeek: [2, 5] },
    progression: {
      progressions: ['kb-press', 'kb-half-get-up'],
      variations: ['kb-half-get-up'],
      pairsWith: ['kb-goblet-squat'],
    },
    cues: [
      'Hold the bell upside down by the horns, close to your face.',
      'Circle it around your head, tracing your skull as tightly as you can.',
      'Ribs stay down and hips stay still — only the shoulders move.',
      'Do half the reps each direction; go slower than feels necessary.',
    ],
    mistakes: [
      'Arching the lower back as the bell passes behind the head.',
      'Circling wide and slow so the shoulders never reach end range.',
    ],
    breathing: 'Steady breathing throughout; never hold your breath.',
    tempo: 4.0,
    poster: 0.25,
    rig: (t) => {
      // The half of the orbit you can actually see: the bell tracks from ear
      // to ear across the face. (The behind-the-head half is hidden by the
      // head from this camera anyway, and the rig has no shoulder rotation
      // axis to carry the arms cleanly through it.)
      const side = sway(t);                    // +1 left, -1 right
      const lift = 0.12 * Math.cos(2 * PI * t);
      return pose({
        ...plantedLegs(0.05, -0.04),
        spine: 0.02,
        spineTwist: 0.2 * side,
        // Arms stay folded with the hands high, close to the head.
        lShoulder: -0.75 - lift, rShoulder: -0.75 - lift,
        lShoulderAbduct: 0.12 + 0.5 * side,
        rShoulderAbduct: 0.12 - 0.5 * side,
        lElbow: -2.2, rElbow: -2.2,
        kettlebell: 'both', kbOrient: 'up',
      });
    },
    camera: { view: 'front', position: [0.5, 2.1, 3.2], target: [0, 1.8, 0] },
  }),

  defineExercise({
    id: 'kb-windmill',
    name: 'KB Windmill',
    category: 'core',
    pattern: 'anti-lateral-flexion',
    secondaryPatterns: ['hinge', 'rotation'],
    planes: ['frontal', 'transverse'],
    force: 'mixed',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'unilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'advanced',
    muscles: {
      primary: ['obliques', 'ql', 'hamstrings'],
      secondary: ['glutes', 'side-delts', 'adductors', 'lats'],
      stabilizers: ['rotator-cuff', 'deep-core', 'triceps'],
    },
    jointActions: [
      { joint: 'spine', action: 'lateral-flexion' },
      { joint: 'hip', action: 'flexion' },
      { joint: 'shoulder', action: 'isometric' },
      { joint: 'spine', action: 'rotation' },
    ],
    demands: { grip: 2, core: 5, cardio: 2, balance: 4, technical: 5, spinalLoad: 3, fatigue: 3 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['mobility', 'strength', 'skill'],
    programming: { sets: 3, reps: 5, weight: 18, restSec: 75, repRange: [3, 8], tempo: '3-1-3-0', rpe: 7, frequencyPerWeek: [1, 2] },
    progression: {
      regressions: ['kb-half-get-up', 'russian-twist'],
      variations: ['kb-half-get-up'],
      pairsWith: ['kb-goblet-squat'],
    },
    cues: [
      'Bell locked overhead, eyes on it the whole rep.',
      'Turn the feet ~45° away from the bell and push that hip out to the side.',
      'Slide the free hand down the inside of the front leg — the bend comes from the hip, not the waist.',
      'Keep the loaded arm vertical and the elbow locked; stand up by driving the hip back under you.',
    ],
    mistakes: [
      'Bending forward instead of hinging and side-bending.',
      'Letting the overhead arm drift out of the vertical line.',
      'Loading it heavy before the position is solid.',
    ],
    breathing: 'Inhale as you descend, exhale as you stand.',
    contraindications: ['Limited overhead shoulder range', 'Acute lower-back pain'],
    tempo: 3.4,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      const spine = lerp(0.06, 0.34, p);
      const side = lerp(0.06, 1.05, p);  // side bend toward the free hand
      return pose({
        ...plantedLegs(lerp(0.12, 0.5, p), -0.08),
        spine,
        spineSide: side,
        spineTwist: lerp(0, -0.3, p),
        // Loaded arm stays vertical: cancel both the hinge and the side bend.
        lShoulder: armPitch(-PI, spine),
        lShoulderAbduct: side,
        lElbow: -0.03,
        // Free hand tracks down the front leg.
        rShoulder: armPitch(lerp(-0.1, 0.2, p), spine),
        rShoulderAbduct: -0.1,
        rElbow: -0.05,
        kettlebell: 'left', kbOrient: 'up',
      });
    },
    camera: { view: 'front', position: [1.7, 1.9, 4.4], target: [0, 1.45, 0] },
  }),

  defineExercise({
    id: 'kb-half-get-up',
    name: 'Half Get-Up',
    aka: ['Half Turkish Get-Up'],
    category: 'core',
    pattern: 'get-up',
    secondaryPatterns: ['trunk-flexion', 'anti-rotation'],
    planes: ['sagittal', 'transverse'],
    force: 'mixed',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'unilateral',
    loading: 'grind',
    setup: 'floor-supine',
    equipment: ['kettlebell', 'mat'],
    equipmentAlt: ['dumbbell'],
    level: 'intermediate',
    muscles: {
      primary: ['abs', 'obliques', 'front-delts'],
      secondary: ['deep-core', 'triceps', 'hip-flexors', 'serratus'],
      stabilizers: ['rotator-cuff', 'ql', 'glutes', 'forearms'],
    },
    jointActions: [
      { joint: 'spine', action: 'flexion' },
      { joint: 'spine', action: 'rotation' },
      { joint: 'shoulder', action: 'isometric' },
      { joint: 'hip', action: 'flexion' },
    ],
    demands: { grip: 3, core: 5, cardio: 3, balance: 4, technical: 5, spinalLoad: 2, fatigue: 3 },
    metric: { type: 'reps', load: 'external', perSide: true },
    goals: ['skill', 'strength', 'mobility'],
    programming: { sets: 3, reps: 5, weight: 26, restSec: 90, repRange: [3, 8], tempo: 'slow', rpe: 7, frequencyPerWeek: [1, 3] },
    progression: {
      regressions: ['crunch', 'plank'],
      progressions: ['kb-windmill'],
      variations: ['kb-windmill'],
      pairsWith: ['kb-swing'],
    },
    cues: [
      'Roll onto your side to pick the bell up with both hands, then press it to lockout.',
      'Same-side knee bent with the foot planted, free arm out at 45° on the floor.',
      'Punch the bell to the ceiling and roll up onto your free elbow, then onto the hand.',
      'Post tall through the free arm, chest open, eyes on the bell the whole time.',
    ],
    mistakes: [
      'Losing the vertical arm — the bell should never drift over your face.',
      'Crunching straight up instead of rolling to the elbow at an angle.',
      'Rushing. This is a slow, deliberate lift; every position should be pausable.',
    ],
    breathing: 'Breathe at each position; never hold your breath under an overhead load.',
    contraindications: ['Shoulder instability', 'Wrist injury'],
    tempo: 4.4,
    poster: 0.5,
    rig: (t) => {
      const p = wave(t);
      // th = how far the torso has pitched up from the floor (0 = supine,
      // 1.35 rad ≈ a tall seated position).
      const th = lerp(0.02, 1.35, p);
      // Pin the hips to the floor so the body rotates around the seat rather
      // than sliding: the lyingFloor environment puts the hips at the origin.
      const rootY = -1.2 * Math.sin(th);
      const rootZ = 1.2 * (Math.cos(th) - 1);
      return pose({
        lyingFloor: true,
        rootRotX: th,
        rootY,
        rootZ,
        // Loaded arm holds world-vertical throughout: the environment already
        // rotates the body by -π/2, so shoulder = -π/2 - th keeps the total
        // rotation at -π (straight up).
        lShoulder: -PI / 2 - th,
        lShoulderAbduct: 0.04,
        lElbow: -0.03,
        // Free arm posts on the floor: bends to the elbow mid-way, then straightens.
        rShoulder: lerp(0.12, 1.0, p),
        rShoulderAbduct: -0.5,
        rElbow: Math.sin(PI * p) * 1.25,
        // Near leg stays planted (constant in world space as the torso rises),
        // far leg stays long on the floor.
        lHip: -0.729 - th, lKnee: -2.8,
        rHip: -th, rKnee: 0,
        kettlebell: 'left', kbOrient: 'up',
      });
    },
    camera: { view: '3q', position: [3.2, 1.9, 3.2], target: [0, 1.15, 0] },
  }),

  // -------------------------------------------------------------------------
  // Carries
  // -------------------------------------------------------------------------
  defineExercise({
    id: 'kb-suitcase-carry',
    name: 'Suitcase Carry',
    category: 'carry',
    pattern: 'carry',
    secondaryPatterns: ['anti-lateral-flexion'],
    planes: ['frontal'],
    force: 'static',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'offset',
    loading: 'carry',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'beginner',
    muscles: {
      primary: ['obliques', 'ql', 'forearms'],
      secondary: ['upper-back', 'glute-med', 'abs'],
      stabilizers: ['deep-core', 'quads', 'calves', 'rotator-cuff'],
    },
    jointActions: [
      { joint: 'spine', action: 'isometric' },
      { joint: 'scapula', action: 'depression' },
      { joint: 'wrist', action: 'isometric' },
    ],
    demands: { grip: 5, core: 4, cardio: 3, balance: 3, technical: 1, spinalLoad: 2, fatigue: 3 },
    metric: { type: 'distance', load: 'external', perSide: true },
    goals: ['endurance', 'strength'],
    programming: { sets: 4, reps: 30, weight: 44, restSec: 60, repRange: [20, 60], rpe: 7, frequencyPerWeek: [1, 3] },
    progression: {
      progressions: ['kb-farmer-carry'],
      variations: ['kb-farmer-carry', 'plank'],
      pairsWith: ['kb-goblet-squat'],
    },
    cues: [
      'One bell, one hand. Stand tall and let it hang without leaning away.',
      'Shoulders level and square — the whole point is refusing to side-bend.',
      'Ribs down, glutes lightly squeezed, normal walking stride.',
      'Walk the same distance on both sides before resting.',
    ],
    mistakes: [
      'Leaning away from the bell to make it feel lighter.',
      'Shrugging the loaded shoulder up toward the ear.',
    ],
    breathing: 'Normal walking rhythm; don\'t hold your breath.',
    tempo: 1.4,
    poster: 0.25,
    rig: (t) => pose({
      ...gait(t),
      spine: 0.03,
      // Bracing against the load: a small, controlled lean away from the bell.
      spineSide: -0.05 + sway(t) * 0.015,
      lShoulder: 0.02, lShoulderAbduct: -0.2, lElbow: -0.04,
      rShoulder: 0.02, rShoulderAbduct: -0.12, rElbow: -0.1,
      kettlebell: 'left', kbOrient: 'hang',
    }),
    camera: { view: 'front', position: [0.9, 1.8, 3.7], target: [0, 1.25, 0] },
  }),

  defineExercise({
    id: 'kb-farmer-carry',
    name: 'Farmer Carry',
    category: 'carry',
    pattern: 'carry',
    planes: ['sagittal'],
    force: 'static',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'carry',
    setup: 'standing',
    equipment: ['kettlebell'],
    equipmentAlt: ['dumbbell'],
    level: 'beginner',
    muscles: {
      primary: ['forearms', 'upper-back'],
      secondary: ['abs', 'obliques', 'quads', 'glutes'],
      stabilizers: ['deep-core', 'calves', 'rotator-cuff', 'lower-back'],
    },
    jointActions: [
      { joint: 'scapula', action: 'depression' },
      { joint: 'spine', action: 'isometric' },
      { joint: 'wrist', action: 'isometric' },
    ],
    demands: { grip: 5, core: 3, cardio: 4, balance: 2, technical: 1, spinalLoad: 3, fatigue: 4 },
    metric: { type: 'distance', load: 'external' },
    goals: ['endurance', 'strength', 'conditioning'],
    programming: { sets: 4, reps: 40, weight: 44, restSec: 75, repRange: [20, 80], rpe: 7, frequencyPerWeek: [1, 3] },
    progression: {
      regressions: ['kb-suitcase-carry'],
      variations: ['kb-suitcase-carry'],
      pairsWith: ['kb-swing'],
    },
    cues: [
      'Deadlift both bells up, then stand tall with the shoulders pulled back and down.',
      'Short, quick steps — no swinging the bells.',
      'Brace the abs like you\'re about to be poked, and breathe shallow but steady.',
      'Set them down under control; most carry injuries happen at the finish.',
    ],
    mistakes: [
      'Rounding forward under the load and letting the shoulders roll.',
      'Long strides that let the bells swing and rotate you.',
    ],
    breathing: 'Steady, shallow breathing without losing the brace.',
    tempo: 1.4,
    poster: 0.25,
    rig: (t) => pose({
      ...gait(t),
      spine: 0.02,
      lShoulder: 0.02, lShoulderAbduct: -0.18, lElbow: -0.04,
      rShoulder: 0.02, rShoulderAbduct: -0.18, rElbow: -0.04,
      kettlebell: 'each', kbOrient: 'hang',
    }),
    camera: { view: 'front', position: [0.7, 1.8, 3.7], target: [0, 1.25, 0] },
  }),
];
