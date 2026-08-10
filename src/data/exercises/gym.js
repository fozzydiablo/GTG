// Barbell / dumbbell / bodyweight / machine exercises.
//
// Every entry is classified against src/data/taxonomy.js — see
// docs/EXERCISE-SCHEMA.md for what each field means and why it exists.
// The `rig(t)` functions are unchanged from the original library; the
// classification around them is new.

import { defineExercise } from '../taxonomy.js';
import { PI, lerp, wave, pose } from '../rig-kit.js';

export const GYM_EXERCISES = [
  defineExercise({
    id: 'bench-press',
    name: 'Bench Press',
    aka: ['Barbell Bench', 'Flat Bench'],

    // — movement shape —
    category: 'push',
    pattern: 'horizontal-press',
    secondaryPatterns: ['elbow-extension'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'bench-supine',

    // — loading —
    equipment: ['barbell', 'bench'],
    equipmentAlt: ['dumbbell', 'kettlebell'],
    level: 'beginner',

    // — what it trains —
    muscles: {
      primary: ['chest', 'triceps', 'front-delts'],
      secondary: ['upper-chest', 'lower-chest', 'serratus'],
      stabilizers: ['lats', 'mid-back', 'deep-core', 'forearms'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'horizontal-adduction' },
      { joint: 'elbow', action: 'extension' },
      { joint: 'scapula', action: 'retraction' },
    ],
    demands: { grip: 2, core: 2, cardio: 2, balance: 2, technical: 3, spinalLoad: 2, fatigue: 4 },

    // — how you program it —
    metric: { type: 'reps', load: 'external' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 4, reps: 5, weight: 95, restSec: 180, repRange: [3, 8], tempo: '3-1-1-0', rpe: 8, frequencyPerWeek: [2, 3] },
    progression: {
      regressions: ['pushup'],
      progressions: [],
      variations: ['incline-bench', 'kb-floor-press', 'pushup'],
      pairsWith: ['row', 'pullup'],
    },

    // — coaching —
    cues: [
      'Plant feet flat — drive into the floor and keep upper back tight on the bench.',
      'Unrack and let the bar settle over your shoulders before the first rep.',
      'Lower under control to mid-chest (nipple line), elbows tucked ~60° from torso.',
      'Press up and slightly back so it finishes over your shoulders, not your face.',
    ],
    mistakes: [
      'Bouncing the bar off the ribcage instead of touching under control.',
      'Elbows flared to 90°, which grinds the shoulder joint.',
      'Hips lifting off the bench to turn it into a decline press.',
    ],
    breathing: 'Big breath at the top, hold it down and through the sticking point, exhale at lockout.',
    contraindications: ['Acute shoulder impingement', 'Recent pec strain'],

    // — animation —
    isBench: true,
    tempo: 3.0,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.5, PI * 0.04, phase);
      const abduct = lerp(0.55, 0.32, phase);
      return pose({
        lying: true,
        lShoulder: -PI / 2,
        rShoulder: -PI / 2,
        lShoulderAbduct: abduct,
        rShoulderAbduct: abduct,
        lElbow: elbow,
        rElbow: elbow,
        // Body extends along the bench. Slight knee flex avoids stiff legs.
        lHip: 0, rHip: 0,
        lKnee: PI * 0.08, rKnee: PI * 0.08,
        barbell: true,
      });
    },
    camera: { view: 'side', position: [3.0, 1.3, 0.6], target: [0, 0.7, 0] },
  }),

  defineExercise({
    id: 'incline-bench',
    name: 'Incline DB Press',
    aka: ['Incline Dumbbell Press'],
    category: 'push',
    pattern: 'horizontal-press',
    secondaryPatterns: ['vertical-press'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'bench-incline',
    equipment: ['dumbbell', 'incline-bench'],
    equipmentAlt: ['barbell', 'kettlebell'],
    level: 'beginner',
    muscles: {
      primary: ['upper-chest', 'front-delts'],
      secondary: ['chest', 'triceps'],
      stabilizers: ['rotator-cuff', 'serratus', 'deep-core'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'shoulder', action: 'horizontal-adduction' },
      { joint: 'elbow', action: 'extension' },
    ],
    demands: { grip: 2, core: 2, cardio: 2, balance: 3, technical: 2, spinalLoad: 1, fatigue: 3 },
    metric: { type: 'reps', load: 'external' },
    goals: ['hypertrophy', 'strength'],
    programming: { sets: 3, reps: 8, weight: 30, restSec: 120, repRange: [6, 12], tempo: '3-0-1-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: { regressions: ['pushup'], variations: ['bench-press', 'overhead-press'], pairsWith: ['row'] },
    cues: [
      'Set bench to 30–45°. Sit back hard so shoulder blades stay pinned.',
      'Start dumbbells at the upper-chest line, palms forward.',
      'Press up and slightly inward without clanging the bells together.',
      'Lower under control until you feel a stretch on the upper chest.',
    ],
    mistakes: [
      'Bench set too steep — past 45° it becomes a shoulder press.',
      'Letting the elbows drift below the bench line and stressing the shoulder capsule.',
    ],
    breathing: 'Inhale on the way down, exhale as you drive up.',
    tempo: 2.6,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.55, PI * 0.05, phase);
      const abduct = lerp(0.32, 0.22, phase);
      // With a 45° back lean (spine = -π/4), arms pointing straight up means
      // shoulder + spine = ±π. So at top of press, shoulder = -3π/4.
      // At bottom, arm is ~45° from vertical, hands by upper chest.
      const shoulder = lerp(-PI * 0.5, -PI * 0.75, phase);
      return pose({
        incline: true,
        spine: -PI / 4,
        lShoulder: shoulder,
        rShoulder: shoulder,
        lShoulderAbduct: abduct,
        rShoulderAbduct: abduct,
        lElbow: elbow,
        rElbow: elbow,
        // Sit on bench: thighs along seat (90° hip flex), calves down (90° knee).
        lHip: PI / 2, rHip: PI / 2,
        lKnee: PI / 2, rKnee: PI / 2,
        dumbbells: true,
      });
    },
    camera: { view: 'side', position: [3.0, 1.3, 1.6], target: [0, 0.85, 0.2] },
  }),

  defineExercise({
    id: 'overhead-press',
    name: 'Overhead Press',
    aka: ['Strict Press', 'Military Press'],
    category: 'push',
    pattern: 'vertical-press',
    secondaryPatterns: ['anti-extension'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['barbell'],
    equipmentAlt: ['dumbbell', 'kettlebell'],
    level: 'intermediate',
    muscles: {
      primary: ['front-delts', 'side-delts', 'triceps'],
      secondary: ['upper-chest', 'upper-back', 'serratus'],
      stabilizers: ['deep-core', 'abs', 'glutes', 'rotator-cuff'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'flexion' },
      { joint: 'shoulder', action: 'abduction' },
      { joint: 'elbow', action: 'extension' },
      { joint: 'scapula', action: 'upward-rotation' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 2, core: 4, cardio: 2, balance: 3, technical: 3, spinalLoad: 3, fatigue: 4 },
    metric: { type: 'reps', load: 'external' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 4, reps: 6, weight: 65, restSec: 150, repRange: [3, 8], tempo: '2-0-1-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: { regressions: ['kb-press'], variations: ['kb-press', 'kb-thruster'], pairsWith: ['pullup', 'lat-pulldown'] },
    cues: [
      'Bar racked on the front delts, elbows just in front of the bar.',
      'Brace abs and squeeze glutes — no leg drive.',
      'Press straight up; once the bar clears your forehead, push your head through.',
      'Finish with biceps near ears, bar over mid-foot.',
    ],
    mistakes: [
      'Leaning back to turn it into an incline press.',
      'Stopping short of lockout so the lats never finish the rep.',
    ],
    breathing: 'Brace before the press, exhale at lockout.',
    contraindications: ['Limited overhead shoulder range', 'Acute lower-back pain'],
    tempo: 2.5,
    rig: (t) => {
      const phase = wave(t);
      // Bottom: bar at clavicle. Upper arm angled slightly forward (~15°),
      // elbow bent ~150° so forearm points up to the bar.
      // Top: arms locked overhead, biceps by ears.
      const shoulder = lerp(-PI * 0.18, -PI, phase);
      const elbow = lerp(PI * 0.85, PI * 0.04, phase);
      const abduct = lerp(0.22, 0.18, phase);
      return pose({
        lShoulder: shoulder,
        rShoulder: shoulder,
        lShoulderAbduct: abduct,
        rShoulderAbduct: abduct,
        lElbow: elbow,
        rElbow: elbow,
        barbell: true,
      });
    },
    camera: { view: '3q', position: [1.8, 1.7, 2.6], target: [0, 1.5, 0] },
  }),

  defineExercise({
    id: 'pushup',
    name: 'Push-up',
    category: 'push',
    pattern: 'horizontal-press',
    secondaryPatterns: ['anti-extension'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'floor-prone',
    equipment: ['bodyweight'],
    equipmentAlt: ['mat'],
    level: 'beginner',
    muscles: {
      primary: ['chest', 'triceps'],
      secondary: ['front-delts', 'serratus'],
      stabilizers: ['abs', 'deep-core', 'glutes', 'quads'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'horizontal-adduction' },
      { joint: 'elbow', action: 'extension' },
      { joint: 'scapula', action: 'protraction' },
      { joint: 'spine', action: 'isometric' },
    ],
    demands: { grip: 1, core: 3, cardio: 2, balance: 2, technical: 2, spinalLoad: 1, fatigue: 2 },
    metric: { type: 'reps', load: 'bodyweight' },
    goals: ['hypertrophy', 'endurance'],
    programming: { sets: 3, reps: 12, weight: 0, restSec: 60, repRange: [8, 25], tempo: '2-0-1-0', rpe: 8, frequencyPerWeek: [2, 4] },
    progression: { progressions: ['bench-press', 'dip'], variations: ['kb-renegade-row', 'bench-press'], pairsWith: ['row'] },
    cues: [
      'Hands directly under shoulders, fingers spread.',
      'Body in one rigid line — squeeze glutes, brace abs.',
      'Lower until chest grazes the floor, elbows ~45° from torso.',
      'Press through the floor; full lockout at the top.',
    ],
    mistakes: [
      'Hips sagging — the set becomes a lower-back exercise.',
      'Head diving to the floor ahead of the chest.',
    ],
    breathing: 'Inhale down, exhale up. Do not hold your breath for long sets.',
    tempo: 2.0,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.55, PI * 0.05, phase);
      const shoulder = -PI / 2;
      const abduct = lerp(0.18, 0.32, phase);
      // Hands stay on the floor (y=0); body height drops as elbows bend.
      // Vertical hand-to-shoulder distance = upperArm + forearm * cos(elbow) = 0.55 + 0.5*cos(e).
      const rootY = 0.55 + 0.5 * Math.cos(elbow);
      return pose({
        plank: true,
        rootY,
        lShoulder: shoulder, rShoulder: shoulder,
        lShoulderAbduct: abduct, rShoulderAbduct: abduct,
        lElbow: elbow, rElbow: elbow,
        lHip: 0, rHip: 0,
        lKnee: 0, rKnee: 0,
      });
    },
    camera: { view: 'side', position: [3.0, 1.2, 0], target: [0, 0.8, 0] },
  }),

  defineExercise({
    id: 'dip',
    name: 'Triceps Dip',
    aka: ['Parallel Bar Dip'],
    category: 'push',
    pattern: 'vertical-press',
    secondaryPatterns: ['elbow-extension'],
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'suspended',
    equipment: ['dip-bars', 'bodyweight'],
    equipmentAlt: [],
    level: 'intermediate',
    muscles: {
      primary: ['triceps', 'lower-chest'],
      secondary: ['front-delts', 'chest'],
      stabilizers: ['abs', 'rotator-cuff', 'mid-back'],
    },
    jointActions: [
      { joint: 'elbow', action: 'extension' },
      { joint: 'shoulder', action: 'extension' },
      { joint: 'scapula', action: 'depression' },
    ],
    demands: { grip: 3, core: 3, cardio: 2, balance: 3, technical: 3, spinalLoad: 1, fatigue: 3 },
    metric: { type: 'reps', load: 'weighted-bodyweight' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 3, reps: 8, weight: 0, restSec: 120, repRange: [5, 12], tempo: '2-1-1-0', rpe: 8, frequencyPerWeek: [1, 2] },
    progression: { regressions: ['pushup'], variations: ['bench-press', 'tricep-pushdown'], pairsWith: ['pullup'] },
    cues: [
      'Lock arms at the top, slight forward lean for chest-dip emphasis.',
      'Keep elbows tracking back, not flaring out wide.',
      'Lower until upper arms are parallel with the floor.',
      'Press hard to a full lockout — squeeze the triceps.',
    ],
    mistakes: [
      'Dropping below parallel with rounded shoulders — the fastest way to a shoulder injury.',
      'Swinging the legs to generate momentum.',
    ],
    breathing: 'Inhale down, exhale through the press.',
    contraindications: ['Shoulder instability', 'Sternum or rib discomfort'],
    tempo: 2.4,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.55, PI * 0.05, phase);
      // Arms tucked alongside torso (shoulder neutral); spine gives the lean.
      const shoulder = 0;
      const abduct = 0.14;
      // Hands locked at dip-bar height (y=1.25). Body rises/falls so:
      // shoulder.y = 1.25 + uA + fA*cos(e) = 1.8 + 0.5*cos(e);
      // root.y = shoulder.y - 1.95 = -0.15 + 0.5*cos(e).
      const rootY = -0.15 + 0.5 * Math.cos(elbow);
      return pose({
        suspended: true,
        rootY,
        spine: 0.12, // slight forward lean
        lShoulder: shoulder, rShoulder: shoulder,
        lShoulderAbduct: abduct, rShoulderAbduct: abduct,
        lElbow: elbow, rElbow: elbow,
        // Legs hang straight; floor is hidden so feet position is fine.
        lHip: 0, rHip: 0,
        lKnee: PI * 0.1, rKnee: PI * 0.1,
      });
    },
    camera: { view: 'side', position: [2.8, 1.4, 0.4], target: [0, 1.05, 0] },
  }),

  defineExercise({
    id: 'pullup',
    name: 'Pull-up',
    aka: ['Chin-up (supinated)'],
    category: 'pull',
    pattern: 'vertical-pull',
    secondaryPatterns: ['elbow-flexion'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'hanging',
    equipment: ['pullup-bar', 'bodyweight'],
    equipmentAlt: ['lat-machine'],
    level: 'intermediate',
    muscles: {
      primary: ['lats', 'biceps', 'mid-back'],
      secondary: ['teres', 'rear-delts', 'brachialis'],
      stabilizers: ['forearms', 'abs', 'rotator-cuff'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'adduction' },
      { joint: 'shoulder', action: 'extension' },
      { joint: 'elbow', action: 'flexion' },
      { joint: 'scapula', action: 'depression' },
    ],
    demands: { grip: 4, core: 3, cardio: 2, balance: 2, technical: 3, spinalLoad: 1, fatigue: 4 },
    metric: { type: 'reps', load: 'weighted-bodyweight' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 3, reps: 6, weight: 0, restSec: 150, repRange: [3, 12], tempo: '2-1-2-0', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: { regressions: ['lat-pulldown'], variations: ['lat-pulldown', 'row'], pairsWith: ['overhead-press', 'bench-press'] },
    cues: [
      'Dead hang start, shoulders packed (don\'t shrug to your ears).',
      'Squeeze the bar and pull your elbows down to your hips.',
      'Bring chest toward the bar; chin clears the bar at the top.',
      'Lower with control to a full hang each rep.',
    ],
    mistakes: [
      'Kipping with the hips when the lats give out.',
      'Half reps that never reach a full hang, so the stretch is skipped.',
    ],
    breathing: 'Exhale on the way up, inhale on the descent.',
    tempo: 2.4,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(0, PI * 0.7, phase);
      // Hands stay at the bar (y=2.5). Vertical hand-to-shoulder distance
      // (with shoulder = -π) is 0.55 + 0.5*cos(elbow). Body height adjusts.
      // shoulder.y = root.y + 1.95 ⇒ root.y = bar.y - 2.5 - 0.5*cos(elbow).
      const rootY = -0.5 * Math.cos(elbow);
      return pose({
        hanging: true,
        rootY,
        lShoulder: -PI, rShoulder: -PI,
        lShoulderAbduct: 0.42, rShoulderAbduct: 0.42,
        lElbow: elbow, rElbow: elbow,
        // Slight bend so feet aren't dramatic; floor is hidden anyway.
        lHip: 0.05, rHip: 0.05,
        lKnee: PI * 0.2, rKnee: PI * 0.2,
      });
    },
    camera: { view: 'front', position: [0.4, 2.0, 3.4], target: [0, 1.8, 0] },
  }),

  defineExercise({
    id: 'row',
    name: 'Bent-over Row',
    aka: ['Barbell Row'],
    category: 'pull',
    pattern: 'horizontal-pull',
    secondaryPatterns: ['hinge'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['barbell'],
    equipmentAlt: ['dumbbell', 'kettlebell', 'cable'],
    level: 'intermediate',
    muscles: {
      primary: ['mid-back', 'lats', 'biceps'],
      secondary: ['rear-delts', 'upper-back', 'brachialis'],
      stabilizers: ['lower-back', 'hamstrings', 'glutes', 'deep-core', 'forearms'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'extension' },
      { joint: 'elbow', action: 'flexion' },
      { joint: 'scapula', action: 'retraction' },
      { joint: 'hip', action: 'isometric' },
    ],
    demands: { grip: 3, core: 3, cardio: 2, balance: 2, technical: 3, spinalLoad: 4, fatigue: 4 },
    metric: { type: 'reps', load: 'external' },
    goals: ['strength', 'hypertrophy'],
    programming: { sets: 4, reps: 8, weight: 95, restSec: 120, repRange: [6, 12], tempo: '2-1-1-1', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: { regressions: ['kb-row'], variations: ['kb-row', 'lat-pulldown'], pairsWith: ['bench-press', 'incline-bench'] },
    cues: [
      'Hinge at the hips, soft knees, flat back at ~45°.',
      'Bar starts hanging at arm\'s length, just below the knees.',
      'Pull the bar to the lower chest / upper abs, elbows tucked.',
      'Squeeze the shoulder blades, then lower under control.',
    ],
    mistakes: [
      'Standing up into the pull so the hips do the rowing.',
      'Rounding the lower back under heavy load.',
    ],
    breathing: 'Brace at the bottom, exhale after the bar touches.',
    contraindications: ['Acute lower-back pain'],
    tempo: 2.4,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.05, PI * 0.85, phase);
      const shoulder = lerp(0, -PI * 0.15, phase);
      return pose({
        // Hinge ~50° from vertical (i.e., torso ~40° above horizontal).
        spine: PI * 0.28,
        lShoulder: shoulder, rShoulder: shoulder,
        lShoulderAbduct: 0.1, rShoulderAbduct: 0.1,
        lElbow: elbow, rElbow: elbow,
        // Soft knee bend, slight hip set-back via small forward hip flex.
        lHip: PI * 0.05, rHip: PI * 0.05,
        lKnee: PI * 0.18, rKnee: PI * 0.18,
        barbell: true,
      });
    },
    camera: { view: 'side', position: [3.4, 1.2, 0.6], target: [0, 0.9, 0] },
  }),

  defineExercise({
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    pattern: 'vertical-pull',
    secondaryPatterns: ['elbow-flexion'],
    planes: ['sagittal', 'frontal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'seated-machine',
    equipment: ['lat-machine', 'cable'],
    equipmentAlt: ['pullup-bar'],
    level: 'beginner',
    muscles: {
      primary: ['lats', 'biceps'],
      secondary: ['mid-back', 'teres', 'rear-delts'],
      stabilizers: ['abs', 'forearms'],
    },
    jointActions: [
      { joint: 'shoulder', action: 'adduction' },
      { joint: 'elbow', action: 'flexion' },
      { joint: 'scapula', action: 'depression' },
    ],
    demands: { grip: 3, core: 2, cardio: 2, balance: 1, technical: 2, spinalLoad: 1, fatigue: 3 },
    metric: { type: 'reps', load: 'external' },
    goals: ['hypertrophy', 'strength'],
    programming: { sets: 3, reps: 10, weight: 100, restSec: 90, repRange: [8, 15], tempo: '2-1-2-0', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: { progressions: ['pullup'], variations: ['pullup', 'row'], pairsWith: ['bench-press'] },
    cues: [
      'Knees locked under the pad, slight backward lean — don\'t rock.',
      'Wide grip; start with arms fully extended overhead.',
      'Pull the bar to the upper chest, driving elbows down and back.',
      'Squeeze lats at the bottom, control the bar back up.',
    ],
    mistakes: [
      'Leaning back 45° and turning it into a row.',
      'Pulling behind the neck, which jams the shoulders.',
    ],
    breathing: 'Exhale as the bar comes down, inhale on the return.',
    tempo: 2.4,
    rig: (t) => {
      const phase = wave(t);
      // Top of motion (bar at chest): shoulder ~-π*0.55, elbow bent.
      // Bottom of motion (arms extended overhead): shoulder ~-π, elbow nearly straight.
      const shoulder = lerp(-PI, -PI * 0.55, phase);
      const elbow = lerp(0.05, PI * 0.85, phase);
      return pose({
        latSeated: true,
        spine: -0.18, // slight backward lean
        lShoulder: shoulder, rShoulder: shoulder,
        lShoulderAbduct: 0.55, rShoulderAbduct: 0.55, // wide grip
        lElbow: elbow, rElbow: elbow,
        // Thighs flat on seat, knees ~90°.
        lHip: PI * 0.5, rHip: PI * 0.5,
        lKnee: PI * 0.5, rKnee: PI * 0.5,
        cables: 'overhead',
        latBar: true,
      });
    },
    camera: { view: 'front', position: [0.2, 2.1, 4.0], target: [0, 1.7, 0] },
  }),

  defineExercise({
    id: 'bicep-curl',
    name: 'DB Bicep Curl',
    category: 'pull',
    pattern: 'elbow-flexion',
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'isolation',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['dumbbell'],
    equipmentAlt: ['kettlebell', 'barbell', 'cable'],
    level: 'beginner',
    muscles: {
      primary: ['biceps'],
      secondary: ['brachialis', 'forearms'],
      stabilizers: ['front-delts', 'deep-core'],
    },
    jointActions: [{ joint: 'elbow', action: 'flexion' }],
    demands: { grip: 2, core: 1, cardio: 1, balance: 1, technical: 1, spinalLoad: 1, fatigue: 2 },
    metric: { type: 'reps', load: 'external' },
    goals: ['hypertrophy'],
    programming: { sets: 3, reps: 10, weight: 25, restSec: 75, repRange: [8, 15], tempo: '2-0-2-1', rpe: 9, frequencyPerWeek: [1, 3] },
    progression: { variations: ['row', 'pullup'], pairsWith: ['tricep-pushdown'] },
    cues: [
      'Stand tall, dumbbells at your sides, palms forward.',
      'Pin elbows to your ribs — no swinging or shoulder roll.',
      'Curl up, squeeze the bicep at the top.',
      'Lower under control; don\'t bounce out of the stretch.',
    ],
    mistakes: [
      'Rocking the torso to throw the weight up.',
      'Elbows drifting forward, turning it into a front raise.',
    ],
    breathing: 'Exhale up, inhale down.',
    tempo: 2.0,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.04, PI * 0.92, phase);
      return pose({
        // Shoulder neutral, slight outward angle so dumbbells clear thighs.
        lShoulder: -0.04, rShoulder: -0.04,
        lShoulderAbduct: 0.1, rShoulderAbduct: 0.1,
        lElbow: elbow, rElbow: elbow,
        dumbbells: true,
      });
    },
    camera: { view: '3q', position: [2.2, 1.4, 2.4], target: [0, 1.2, 0] },
  }),

  defineExercise({
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'push',
    pattern: 'elbow-extension',
    planes: ['sagittal'],
    force: 'push',
    mechanics: 'isolation',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    equipment: ['cable'],
    equipmentAlt: ['dumbbell', 'kettlebell'],
    level: 'beginner',
    muscles: {
      primary: ['triceps'],
      secondary: [],
      stabilizers: ['abs', 'lats', 'forearms'],
    },
    jointActions: [{ joint: 'elbow', action: 'extension' }],
    demands: { grip: 2, core: 1, cardio: 1, balance: 1, technical: 1, spinalLoad: 1, fatigue: 2 },
    metric: { type: 'reps', load: 'external' },
    goals: ['hypertrophy'],
    programming: { sets: 3, reps: 12, weight: 40, restSec: 60, repRange: [10, 20], tempo: '2-0-1-1', rpe: 9, frequencyPerWeek: [1, 3] },
    progression: { variations: ['dip', 'kb-floor-press'], pairsWith: ['bicep-curl'] },
    cues: [
      'Stand close to the column, slight forward lean from the hips.',
      'Pin elbows to your ribs — they don\'t move.',
      'Press the bar down to thigh level, squeeze the triceps.',
      'Let the bar return only as far as 90° — keep tension on the muscle.',
    ],
    mistakes: [
      'Using bodyweight to push the bar down.',
      'Elbows flaring away from the ribs at the bottom.',
    ],
    breathing: 'Exhale as you press down.',
    tempo: 1.8,
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.92, PI * 0.05, phase);
      return pose({
        cableStanding: true,
        spine: 0.1, // slight forward lean
        lShoulder: 0.05, rShoulder: 0.05,
        lShoulderAbduct: 0.1, rShoulderAbduct: 0.1,
        lElbow: elbow, rElbow: elbow,
        cables: 'overhead',
      });
    },
    camera: { view: '3q', position: [2.0, 1.4, 2.6], target: [0, 1.1, 0] },
  }),

  defineExercise({
    id: 'plank',
    name: 'Plank',
    category: 'core',
    pattern: 'anti-extension',
    planes: ['sagittal'],
    force: 'static',
    mechanics: 'compound',
    chain: 'closed',
    laterality: 'bilateral',
    loading: 'isometric',
    setup: 'floor-prone',
    equipment: ['bodyweight', 'mat'],
    equipmentAlt: [],
    level: 'beginner',
    muscles: {
      primary: ['abs', 'deep-core'],
      secondary: ['obliques', 'front-delts', 'serratus'],
      stabilizers: ['glutes', 'quads', 'lower-back'],
    },
    jointActions: [
      { joint: 'spine', action: 'isometric' },
      { joint: 'hip', action: 'isometric' },
      { joint: 'scapula', action: 'protraction' },
    ],
    demands: { grip: 1, core: 5, cardio: 2, balance: 2, technical: 2, spinalLoad: 1, fatigue: 2 },
    metric: { type: 'time', load: 'bodyweight' },
    goals: ['endurance'],
    programming: { sets: 3, reps: 60, weight: 0, restSec: 60, repRange: [20, 120], rpe: 8, frequencyPerWeek: [2, 5] },
    progression: { progressions: ['kb-renegade-row', 'hanging-leg-raise'], variations: ['kb-suitcase-carry'], pairsWith: [] },
    cues: [
      'Forearms on the floor, shoulders stacked over elbows.',
      'Body is one straight line from heels to head.',
      'Squeeze glutes and brace abs — don\'t let hips sag.',
      'Breathe slow and even through the hold.',
    ],
    mistakes: [
      'Hips creeping up into a pike to make it easier.',
      'Holding your breath, which spikes blood pressure and shortens the set.',
    ],
    breathing: 'Slow nasal breathing without losing the brace.',
    tempo: 4.0,
    rig: (t) => {
      const breathe = Math.sin(2 * PI * t) * 0.025;
      // Forearm-supported plank: shoulder = upperArm above floor.
      return pose({
        plank: true,
        forearm: true,
        rootY: 0.55,
        lShoulder: -PI / 2, rShoulder: -PI / 2,
        lShoulderAbduct: 0.18, rShoulderAbduct: 0.18,
        lElbow: PI / 2, rElbow: PI / 2,
        lHip: -breathe, rHip: -breathe,
        lKnee: 0, rKnee: 0,
      });
    },
    camera: { view: 'side', position: [3.2, 1.0, 0], target: [0, 0.55, 0] },
  }),

  defineExercise({
    id: 'crunch',
    name: 'Crunch',
    category: 'core',
    pattern: 'trunk-flexion',
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'isolation',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'floor-supine',
    equipment: ['bodyweight', 'mat'],
    equipmentAlt: [],
    level: 'beginner',
    muscles: {
      primary: ['abs'],
      secondary: ['obliques'],
      stabilizers: ['hip-flexors', 'deep-core'],
    },
    jointActions: [{ joint: 'spine', action: 'flexion' }],
    demands: { grip: 1, core: 3, cardio: 1, balance: 1, technical: 1, spinalLoad: 2, fatigue: 2 },
    metric: { type: 'reps', load: 'bodyweight' },
    goals: ['hypertrophy', 'endurance'],
    programming: { sets: 3, reps: 15, weight: 0, restSec: 45, repRange: [12, 25], tempo: '2-1-1-0', rpe: 9, frequencyPerWeek: [2, 4] },
    progression: { progressions: ['hanging-leg-raise', 'kb-half-get-up'], variations: ['russian-twist'], pairsWith: [] },
    cues: [
      'Lie on your back, knees bent, feet flat.',
      'Curl your ribs toward your hips — don\'t yank on your neck.',
      'Lower back stays pinned to the floor the entire time.',
      'Exhale at the top, inhale on the way down.',
    ],
    mistakes: [
      'Pulling on the head with the hands.',
      'Racing through reps with momentum instead of curling the spine.',
    ],
    breathing: 'Exhale hard at the top of each rep.',
    contraindications: ['Disc-related lower-back pain'],
    tempo: 1.6,
    rig: (t) => {
      const phase = wave(t);
      const spine = lerp(0.02, PI * 0.32, phase);
      return pose({
        lyingFloor: true,
        spine,
        // Hands behind head: shoulder rotated up, elbow bent.
        lShoulder: -PI * 0.55, rShoulder: -PI * 0.55,
        lShoulderAbduct: 0.5, rShoulderAbduct: 0.5,
        lElbow: PI * 0.75, rElbow: PI * 0.75,
        // Knees bent, feet flat. Lying supine the body is rotated -π/2, so a
        // NEGATIVE hip lifts the knee away from the floor and the knee value
        // drops the shin back down to it (see kb-floor-press for the same maths).
        lHip: -1.2, rHip: -1.2,
        lKnee: -2.27, rKnee: -2.27,
      });
    },
    camera: { view: 'side', position: [3.0, 1.0, 0], target: [0, 0.4, 0] },
  }),

  defineExercise({
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'core',
    pattern: 'rotation',
    planes: ['transverse'],
    force: 'mixed',
    mechanics: 'isolation',
    chain: 'open',
    laterality: 'alternating',
    loading: 'grind',
    setup: 'floor-seated',
    equipment: ['plate', 'mat'],
    equipmentAlt: ['kettlebell', 'dumbbell', 'bodyweight'],
    level: 'beginner',
    muscles: {
      primary: ['obliques', 'abs'],
      secondary: ['deep-core', 'hip-flexors'],
      stabilizers: ['lower-back', 'front-delts'],
    },
    jointActions: [
      { joint: 'spine', action: 'rotation' },
      { joint: 'hip', action: 'isometric' },
    ],
    demands: { grip: 2, core: 4, cardio: 2, balance: 3, technical: 2, spinalLoad: 3, fatigue: 2 },
    metric: { type: 'reps', load: 'external' },
    goals: ['hypertrophy', 'endurance'],
    programming: { sets: 3, reps: 20, weight: 10, restSec: 45, repRange: [16, 30], rpe: 8, frequencyPerWeek: [1, 3] },
    progression: { progressions: ['kb-windmill'], variations: ['kb-halo'], pairsWith: ['plank'] },
    cues: [
      'Sit, lean back ~45°, brace the core.',
      'Heels lifted (advanced) or planted (regular).',
      'Rotate from the torso — keep arms close to your body.',
      'Tap the plate to each side, controlled, no momentum.',
    ],
    mistakes: [
      'Swinging the arms while the ribcage stays still.',
      'Rounding hard into the lower back under load.',
    ],
    breathing: 'Exhale on each rotation.',
    contraindications: ['Disc-related lower-back pain'],
    tempo: 2.2,
    rig: (t) => {
      // Continuous swing side-to-side rather than ping-pong (prevents pause).
      const swing = Math.sin(2 * PI * t) * 0.65;
      return pose({
        seatedFloor: true,
        spine: PI * 0.32, // 45° backward lean (negated by environment)
        rootRotY: swing,
        // Arms holding plate at chest; mostly fixed.
        lShoulder: -PI * 0.32, rShoulder: -PI * 0.32,
        lShoulderAbduct: 0.05, rShoulderAbduct: 0.05,
        lElbow: PI * 0.65, rElbow: PI * 0.65,
        // Hips bent, knees bent (V-sit).
        lHip: PI * 0.55, rHip: PI * 0.55,
        lKnee: PI * 0.55, rKnee: PI * 0.55,
        plate: true,
      });
    },
    camera: { view: 'front', position: [0.4, 1.2, 3.0], target: [0, 0.7, 0] },
  }),

  defineExercise({
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    pattern: 'hip-flexion',
    secondaryPatterns: ['anti-extension'],
    planes: ['sagittal'],
    force: 'pull',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'hanging',
    equipment: ['pullup-bar', 'bodyweight'],
    equipmentAlt: [],
    level: 'intermediate',
    muscles: {
      primary: ['lower-abs', 'hip-flexors'],
      secondary: ['abs', 'obliques'],
      stabilizers: ['forearms', 'lats', 'deep-core'],
    },
    jointActions: [
      { joint: 'hip', action: 'flexion' },
      { joint: 'spine', action: 'flexion' },
    ],
    demands: { grip: 4, core: 5, cardio: 2, balance: 2, technical: 3, spinalLoad: 1, fatigue: 3 },
    metric: { type: 'reps', load: 'bodyweight' },
    goals: ['hypertrophy', 'strength'],
    programming: { sets: 3, reps: 10, weight: 0, restSec: 75, repRange: [6, 15], tempo: '3-1-2-0', rpe: 8, frequencyPerWeek: [1, 3] },
    progression: { regressions: ['crunch'], variations: ['plank'], pairsWith: [] },
    cues: [
      'Dead hang from the bar, shoulders packed, no swinging.',
      'Tilt pelvis up first — don\'t just lift the legs.',
      'Raise to at least 90°; stop swinging by pausing at the top.',
      'Lower under control over 2–3 seconds.',
    ],
    mistakes: [
      'Swinging into each rep so the hip flexors do all the work.',
      'Never posteriorly tilting the pelvis, which skips the abs entirely.',
    ],
    breathing: 'Exhale as the legs come up.',
    tempo: 2.6,
    rig: (t) => {
      const phase = wave(t);
      const hip = lerp(0, PI * 0.55, phase);
      const knee = lerp(0.05, PI * 0.15, phase);
      // Body hangs from bar at y=2.5: shoulder.y = root.y + 1.95, hand.y = shoulder.y + 1.05.
      // For hand.y = 2.5 ⇒ root.y = -0.5.
      return pose({
        hanging: true,
        rootY: -0.5,
        lShoulder: -PI, rShoulder: -PI,
        lShoulderAbduct: 0.15, rShoulderAbduct: 0.15,
        lElbow: 0.04, rElbow: 0.04,
        lHip: hip, rHip: hip,
        lKnee: knee, rKnee: knee,
      });
    },
    camera: { view: 'side', position: [3.6, 1.7, 0.6], target: [0, 1.3, 0] },
  }),
];
