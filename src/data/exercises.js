// Each exercise defines an animation `rig(t)` returning joint angles (radians)
// for the stick figure. `t` is a phase in [0, 1] that loops.
// Angles use this convention (in the figure's local space, viewer in front):
//   shoulder/elbow/hip/knee:   0 = arm/leg straight down,
//                              positive rotates forward (toward viewer-right when viewed from side).
// Most exercises are framed so that rotating the figure shows the motion clearly.

const PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
// pingpong: 0->1->0
const pp = (t) => 1 - Math.abs(1 - 2 * t);
// smooth pingpong using cosine
const wave = (t) => 0.5 - 0.5 * Math.cos(2 * PI * t);

// Default neutral pose (radians).
const NEUTRAL = {
  spine: 0,           // forward bend at hips
  neck: 0,
  lShoulder: 0, rShoulder: 0,   // forward raise
  lShoulderAbduct: 0, rShoulderAbduct: 0, // out to side
  lElbow: 0, rElbow: 0,         // bend
  lHip: 0, rHip: 0,             // forward raise
  lKnee: 0, rKnee: 0,           // bend
  rootY: 0,           // vertical offset
  rootRotY: 0,        // body rotation around vertical
};

function pose(overrides) {
  return { ...NEUTRAL, ...overrides };
}

export const EXERCISES = [
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'push',
    primary: ['Chest', 'Triceps', 'Front Delts'],
    cues: [
      'Plant feet, squeeze shoulder blades down and back.',
      'Bar path: lower to mid-chest, press up and slightly back over shoulders.',
      'Wrists stacked over elbows, full lockout at the top.',
    ],
    defaults: { sets: 4, reps: 5, weight: 95 },
    isBench: true,
    view: 'side',
    rig: (t) => {
      // Lying on bench, arms press up. Show as figure rotated 90 to "lie back".
      const phase = wave(t);
      const elbow = lerp(PI * 0.05, PI * 0.85, phase); // 5° (near locked) -> 95° bend
      const shoulder = lerp(-PI * 0.02, PI * 0.25, phase); // arm angle
      return pose({
        rootRotY: 0,
        lying: true,           // hint for renderer to lay figure on bench
        lShoulder: -PI / 2 + shoulder,
        rShoulder: -PI / 2 + shoulder,
        lShoulderAbduct: 0.35,
        rShoulderAbduct: 0.35,
        lElbow: elbow,
        rElbow: elbow,
        lHip: PI * 0.5,        // legs hanging off side
        rHip: PI * 0.5,
        lKnee: PI * 0.5,
        rKnee: PI * 0.5,
      });
    },
  },
  {
    id: 'incline-bench',
    name: 'Incline DB Press',
    category: 'push',
    primary: ['Upper Chest', 'Front Delts'],
    cues: [
      'Set bench to ~30°. Dumbbells start at upper chest.',
      'Press up and slightly inward, controlled descent.',
    ],
    defaults: { sets: 3, reps: 8, weight: 30 },
    view: 'side',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.1, PI * 0.85, phase);
      const shoulder = lerp(-PI * 0.65, -PI * 0.35, phase);
      return pose({
        incline: true,
        lShoulder: shoulder,
        rShoulder: shoulder,
        lShoulderAbduct: 0.3,
        rShoulderAbduct: 0.3,
        lElbow: elbow,
        rElbow: elbow,
        lHip: PI * 0.15,
        rHip: PI * 0.15,
        lKnee: PI * 0.5,
        rKnee: PI * 0.5,
      });
    },
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'push',
    primary: ['Shoulders', 'Triceps', 'Upper Chest'],
    cues: [
      'Bar at front rack, elbows just in front of bar.',
      'Press straight up, push head through at lockout.',
      'Brace core, glutes tight — no leg drive.',
    ],
    defaults: { sets: 4, reps: 6, weight: 65 },
    view: 'front',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.85, PI * 0.05, phase); // bent -> straight up
      const shoulder = lerp(PI * 0.15, PI * 0.95, phase);
      return pose({
        lShoulder: -shoulder,
        rShoulder: -shoulder,
        lShoulderAbduct: 0.25,
        rShoulderAbduct: 0.25,
        lElbow: elbow,
        rElbow: elbow,
      });
    },
  },
  {
    id: 'pushup',
    name: 'Push-up',
    category: 'push',
    primary: ['Chest', 'Triceps', 'Core'],
    cues: [
      'Hands under shoulders, body in a rigid plank.',
      'Lower chest to fists, elbows ~45° from torso.',
    ],
    defaults: { sets: 3, reps: 12, weight: 0 },
    view: 'side',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.05, PI * 0.85, phase);
      return pose({
        plank: true,
        lShoulder: -PI / 2,
        rShoulder: -PI / 2,
        lElbow: elbow,
        rElbow: elbow,
        lHip: PI / 2,
        rHip: PI / 2,
        lKnee: 0,
        rKnee: 0,
      });
    },
  },
  {
    id: 'dip',
    name: 'Triceps Dip',
    category: 'push',
    primary: ['Triceps', 'Lower Chest'],
    cues: [
      'Lock arms, lean torso slightly forward.',
      'Lower until upper arm is parallel; press to lockout.',
    ],
    defaults: { sets: 3, reps: 8, weight: 0 },
    view: 'side',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.05, PI * 0.95, phase);
      return pose({
        suspended: true,
        lShoulder: 0,
        rShoulder: 0,
        lShoulderAbduct: 0.05,
        rShoulderAbduct: 0.05,
        lElbow: elbow,
        rElbow: elbow,
        lHip: PI * 0.25,
        rHip: PI * 0.25,
        lKnee: PI * 0.5,
        rKnee: PI * 0.5,
        rootY: -elbow * 0.15,
      });
    },
  },
  {
    id: 'pullup',
    name: 'Pull-up',
    category: 'pull',
    primary: ['Lats', 'Biceps', 'Upper Back'],
    cues: [
      'Dead hang start, shoulders packed.',
      'Pull chest to bar, drive elbows to hips.',
    ],
    defaults: { sets: 3, reps: 6, weight: 0 },
    view: 'front',
    rig: (t) => {
      const phase = wave(t);
      // shoulder fully overhead at hang -> elbows tucked, arms ~90° at top
      const shoulder = lerp(PI, PI * 0.55, phase);
      const elbow = lerp(PI * 0.05, PI * 0.85, phase);
      return pose({
        hanging: true,
        lShoulder: -shoulder,
        rShoulder: -shoulder,
        lShoulderAbduct: 0.45,
        rShoulderAbduct: 0.45,
        lElbow: elbow,
        rElbow: elbow,
        lHip: 0.05,
        rHip: 0.05,
        lKnee: 0.4,
        rKnee: 0.4,
        rootY: lerp(0, 0.6, phase),
      });
    },
  },
  {
    id: 'row',
    name: 'Bent-over Row',
    category: 'pull',
    primary: ['Mid Back', 'Lats', 'Biceps'],
    cues: [
      'Hinge at hips, flat back ~45°.',
      'Pull bar to belly button, elbows tight.',
    ],
    defaults: { sets: 4, reps: 8, weight: 95 },
    view: 'side',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.08, PI * 0.85, phase);
      const shoulder = lerp(-PI * 0.05, PI * 0.4, phase);
      return pose({
        spine: PI * 0.4,
        lShoulder: shoulder,
        rShoulder: shoulder,
        lElbow: elbow,
        rElbow: elbow,
        lHip: PI * 0.4,
        rHip: PI * 0.4,
        lKnee: PI * 0.15,
        rKnee: PI * 0.15,
      });
    },
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    primary: ['Lats', 'Biceps'],
    cues: [
      'Slight backward lean, chest up.',
      'Pull bar to upper chest, drive elbows down.',
    ],
    defaults: { sets: 3, reps: 10, weight: 100 },
    view: 'front',
    rig: (t) => {
      const phase = wave(t);
      const shoulder = lerp(PI * 0.95, PI * 0.55, phase);
      const elbow = lerp(PI * 0.1, PI * 0.85, phase);
      return pose({
        seated: true,
        lShoulder: -shoulder,
        rShoulder: -shoulder,
        lShoulderAbduct: 0.5,
        rShoulderAbduct: 0.5,
        lElbow: elbow,
        rElbow: elbow,
        lHip: PI * 0.5,
        rHip: PI * 0.5,
        lKnee: PI * 0.5,
        rKnee: PI * 0.5,
      });
    },
  },
  {
    id: 'bicep-curl',
    name: 'Bicep Curl',
    category: 'pull',
    primary: ['Biceps'],
    cues: [
      'Elbows pinned to sides, no swinging.',
      'Squeeze at the top, controlled descent.',
    ],
    defaults: { sets: 3, reps: 10, weight: 25 },
    view: 'front',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.05, PI * 0.95, phase);
      return pose({
        lShoulder: 0,
        rShoulder: 0,
        lShoulderAbduct: 0.08,
        rShoulderAbduct: 0.08,
        lElbow: elbow,
        rElbow: elbow,
      });
    },
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'push',
    primary: ['Triceps'],
    cues: [
      'Elbows pinned to sides.',
      'Extend fully without rocking torso.',
    ],
    defaults: { sets: 3, reps: 12, weight: 40 },
    view: 'front',
    rig: (t) => {
      const phase = wave(t);
      const elbow = lerp(PI * 0.95, PI * 0.05, phase);
      return pose({
        lShoulder: 0,
        rShoulder: 0,
        lShoulderAbduct: 0.08,
        rShoulderAbduct: 0.08,
        lElbow: elbow,
        rElbow: elbow,
      });
    },
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    primary: ['Core', 'Shoulders'],
    cues: [
      'Forearms under shoulders, body in a line.',
      'Squeeze glutes, brace abs, breathe.',
    ],
    defaults: { sets: 3, reps: 60, weight: 0, unit: 'sec' },
    view: 'side',
    rig: (t) => {
      const breathe = Math.sin(2 * PI * t) * 0.02;
      return pose({
        plank: true,
        forearm: true,
        lShoulder: -PI / 2,
        rShoulder: -PI / 2,
        lElbow: PI / 2,
        rElbow: PI / 2,
        lHip: PI / 2 + breathe,
        rHip: PI / 2 + breathe,
        lKnee: 0,
        rKnee: 0,
      });
    },
  },
  {
    id: 'crunch',
    name: 'Crunch',
    category: 'core',
    primary: ['Abs'],
    cues: [
      'Lower back stays on the floor.',
      'Curl ribs toward hips, exhale on the way up.',
    ],
    defaults: { sets: 3, reps: 15, weight: 0 },
    view: 'side',
    rig: (t) => {
      const phase = wave(t);
      const spine = lerp(0.05, PI * 0.35, phase);
      return pose({
        lying: true,
        spine,
        lShoulder: -PI * 0.4,
        rShoulder: -PI * 0.4,
        lElbow: PI * 0.7,
        rElbow: PI * 0.7,
        lHip: PI * 0.5,
        rHip: PI * 0.5,
        lKnee: PI * 0.5,
        rKnee: PI * 0.5,
      });
    },
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'core',
    primary: ['Obliques', 'Abs'],
    cues: [
      'Lean back ~45°, feet hover.',
      'Rotate from the torso, not the arms.',
    ],
    defaults: { sets: 3, reps: 20, weight: 10 },
    view: 'front',
    rig: (t) => {
      const swing = Math.sin(2 * PI * t) * 0.6;
      return pose({
        seated: true,
        spine: PI * 0.35,
        rootRotY: swing,
        lShoulder: -PI * 0.35,
        rShoulder: -PI * 0.35,
        lShoulderAbduct: 0.05,
        rShoulderAbduct: 0.05,
        lElbow: PI * 0.6,
        rElbow: PI * 0.6,
        lHip: PI * 0.55,
        rHip: PI * 0.55,
        lKnee: PI * 0.55,
        rKnee: PI * 0.55,
      });
    },
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    primary: ['Lower Abs', 'Hip Flexors'],
    cues: [
      'Dead hang, no swinging.',
      'Lift legs to 90° (or higher), control the descent.',
    ],
    defaults: { sets: 3, reps: 10, weight: 0 },
    view: 'side',
    rig: (t) => {
      const phase = wave(t);
      const hip = lerp(0, PI * 0.55, phase);
      return pose({
        hanging: true,
        lShoulder: -PI,
        rShoulder: -PI,
        lShoulderAbduct: 0.15,
        rShoulderAbduct: 0.15,
        lElbow: PI * 0.05,
        rElbow: PI * 0.05,
        lHip: hip,
        rHip: hip,
        lKnee: lerp(0, PI * 0.2, phase),
        rKnee: lerp(0, PI * 0.2, phase),
      });
    },
  },
];

// Curated split for 4-5x/week, upper body + core focus, biased toward bench progression.
export const SPLIT = [
  {
    id: 'day-1',
    title: 'Day 1 — Bench Focus',
    subtitle: 'Heavy push, accessory triceps',
    exercises: ['bench-press', 'incline-bench', 'tricep-pushdown', 'plank'],
  },
  {
    id: 'day-2',
    title: 'Day 2 — Pull',
    subtitle: 'Back & biceps for pressing balance',
    exercises: ['pullup', 'row', 'lat-pulldown', 'bicep-curl'],
  },
  {
    id: 'day-3',
    title: 'Day 3 — Shoulders + Core',
    subtitle: 'Overhead strength & midline',
    exercises: ['overhead-press', 'dip', 'hanging-leg-raise', 'russian-twist'],
  },
  {
    id: 'day-4',
    title: 'Day 4 — Bench Volume',
    subtitle: 'Hypertrophy push for chest growth',
    exercises: ['bench-press', 'pushup', 'incline-bench', 'crunch'],
  },
  {
    id: 'day-5',
    title: 'Day 5 — Pull + Core (Optional)',
    subtitle: 'Light pull, core finisher',
    exercises: ['row', 'bicep-curl', 'plank', 'hanging-leg-raise'],
  },
];

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id);
}

// Heuristic: which split day to suggest "today" based on day-of-week.
export function suggestedDay(date = new Date()) {
  // Mon=1..Sun=0 -> map to indexes in SPLIT
  const map = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 0, 0: 1 };
  return SPLIT[map[date.getDay()]];
}
