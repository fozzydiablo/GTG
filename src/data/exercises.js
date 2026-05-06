// Each exercise defines an animation `rig(t)` returning a pose for the
// stick figure plus environment/equipment hints (`lying`, `barbell`, etc.).
// `t` is a phase in [0, 1] that loops.
//
// Rotation convention (figure faces +Z, limbs hang along -Y at neutral):
//   shoulderForward / hipForward — rotate around +X.
//     With arm hanging at -Y, +π/2 rotates the limb to -Z (behind the figure),
//     -π/2 rotates it to +Z (in front), ±π rotates it to +Y (overhead).
//   shoulderAbduct — rotate the upper arm out to the side (around Z).
//   elbow / knee — bend (around +X). Positive = limb bent.
// `rootRotY` rotates the whole figure around Y (used for twists).
//
// Environment hints (one per exercise):
//   lying        — supine on flat bench (head at -Z end of bench)
//   lyingFloor   — supine on floor mat
//   plank        — prone on floor mat (face down)
//   incline      — sitting on incline bench at ~40°
//   hanging      — hanging from overhead pull-up bar
//   suspended    — supported on parallel dip bars
//   latSeated    — seated at lat-pulldown station
//   seatedFloor  — seated on the floor (russian twist)
//   cableStanding— standing in front of a cable column
//
// Equipment hints (rendered on top of the figure):
//   barbell      — straight bar between both hands
//   dumbbells    — small dumbbell in each hand
//   cables       — 'overhead' draws cables from each hand up to a high pulley
//   plate        — single weight plate held in both hands
//   latBar       — wide-grip lat bar pinned between both hands

const PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const wave = (t) => 0.5 - 0.5 * Math.cos(2 * PI * t);

const NEUTRAL = {
  spine: 0, neck: 0,
  lShoulder: 0, rShoulder: 0,
  lShoulderAbduct: 0, rShoulderAbduct: 0,
  lElbow: 0, rElbow: 0,
  lHip: 0, rHip: 0,
  lKnee: 0, rKnee: 0,
  rootY: 0, rootRotY: 0,
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
      'Plant feet flat — drive into the floor and keep upper back tight on the bench.',
      'Unrack and let the bar settle over your shoulders before the first rep.',
      'Lower under control to mid-chest (nipple line), elbows tucked ~60° from torso.',
      'Press up and slightly back so it finishes over your shoulders, not your face.',
    ],
    defaults: { sets: 4, reps: 5, weight: 95 },
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
  },
  {
    id: 'incline-bench',
    name: 'Incline DB Press',
    category: 'push',
    primary: ['Upper Chest', 'Front Delts'],
    cues: [
      'Set bench to 30–45°. Sit back hard so shoulder blades stay pinned.',
      'Start dumbbells at the upper-chest line, palms forward.',
      'Press up and slightly inward without clanging the bells together.',
      'Lower under control until you feel a stretch on the upper chest.',
    ],
    defaults: { sets: 3, reps: 8, weight: 30 },
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
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'push',
    primary: ['Shoulders', 'Triceps', 'Upper Chest'],
    cues: [
      'Bar racked on the front delts, elbows just in front of the bar.',
      'Brace abs and squeeze glutes — no leg drive.',
      'Press straight up; once the bar clears your forehead, push your head through.',
      'Finish with biceps near ears, bar over mid-foot.',
    ],
    defaults: { sets: 4, reps: 6, weight: 65 },
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
  },
  {
    id: 'pushup',
    name: 'Push-up',
    category: 'push',
    primary: ['Chest', 'Triceps', 'Core'],
    cues: [
      'Hands directly under shoulders, fingers spread.',
      'Body in one rigid line — squeeze glutes, brace abs.',
      'Lower until chest grazes the floor, elbows ~45° from torso.',
      'Press through the floor; full lockout at the top.',
    ],
    defaults: { sets: 3, reps: 12, weight: 0 },
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
  },
  {
    id: 'dip',
    name: 'Triceps Dip',
    category: 'push',
    primary: ['Triceps', 'Lower Chest'],
    cues: [
      'Lock arms at the top, slight forward lean for chest-dip emphasis.',
      'Keep elbows tracking back, not flaring out wide.',
      'Lower until upper arms are parallel with the floor.',
      'Press hard to a full lockout — squeeze the triceps.',
    ],
    defaults: { sets: 3, reps: 8, weight: 0 },
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
  },
  {
    id: 'pullup',
    name: 'Pull-up',
    category: 'pull',
    primary: ['Lats', 'Biceps', 'Upper Back'],
    cues: [
      'Dead hang start, shoulders packed (don\'t shrug to your ears).',
      'Squeeze the bar and pull your elbows down to your hips.',
      'Bring chest toward the bar; chin clears the bar at the top.',
      'Lower with control to a full hang each rep.',
    ],
    defaults: { sets: 3, reps: 6, weight: 0 },
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
  },
  {
    id: 'row',
    name: 'Bent-over Row',
    category: 'pull',
    primary: ['Mid Back', 'Lats', 'Biceps'],
    cues: [
      'Hinge at the hips, soft knees, flat back at ~45°.',
      'Bar starts hanging at arm\'s length, just below the knees.',
      'Pull the bar to the lower chest / upper abs, elbows tucked.',
      'Squeeze the shoulder blades, then lower under control.',
    ],
    defaults: { sets: 4, reps: 8, weight: 95 },
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
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    primary: ['Lats', 'Biceps'],
    cues: [
      'Knees locked under the pad, slight backward lean — don\'t rock.',
      'Wide grip; start with arms fully extended overhead.',
      'Pull the bar to the upper chest, driving elbows down and back.',
      'Squeeze lats at the bottom, control the bar back up.',
    ],
    defaults: { sets: 3, reps: 10, weight: 100 },
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
  },
  {
    id: 'bicep-curl',
    name: 'DB Bicep Curl',
    category: 'pull',
    primary: ['Biceps'],
    cues: [
      'Stand tall, dumbbells at your sides, palms forward.',
      'Pin elbows to your ribs — no swinging or shoulder roll.',
      'Curl up, squeeze the bicep at the top.',
      'Lower under control; don\'t bounce out of the stretch.',
    ],
    defaults: { sets: 3, reps: 10, weight: 25 },
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
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'push',
    primary: ['Triceps'],
    cues: [
      'Stand close to the column, slight forward lean from the hips.',
      'Pin elbows to your ribs — they don\'t move.',
      'Press the bar down to thigh level, squeeze the triceps.',
      'Let the bar return only as far as 90° — keep tension on the muscle.',
    ],
    defaults: { sets: 3, reps: 12, weight: 40 },
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
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    primary: ['Core', 'Shoulders'],
    cues: [
      'Forearms on the floor, shoulders stacked over elbows.',
      'Body is one straight line from heels to head.',
      'Squeeze glutes and brace abs — don\'t let hips sag.',
      'Breathe slow and even through the hold.',
    ],
    defaults: { sets: 3, reps: 60, weight: 0, unit: 'sec' },
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
  },
  {
    id: 'crunch',
    name: 'Crunch',
    category: 'core',
    primary: ['Abs'],
    cues: [
      'Lie on your back, knees bent, feet flat.',
      'Curl your ribs toward your hips — don\'t yank on your neck.',
      'Lower back stays pinned to the floor the entire time.',
      'Exhale at the top, inhale on the way down.',
    ],
    defaults: { sets: 3, reps: 15, weight: 0 },
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
        // Knees bent, feet flat (same logic as bench-press legs).
        lHip: PI / 2, rHip: PI / 2,
        lKnee: PI * 0.55, rKnee: PI * 0.55,
      });
    },
    camera: { view: 'side', position: [3.0, 1.0, 0], target: [0, 0.4, 0] },
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'core',
    primary: ['Obliques', 'Abs'],
    cues: [
      'Sit, lean back ~45°, brace the core.',
      'Heels lifted (advanced) or planted (regular).',
      'Rotate from the torso — keep arms close to your body.',
      'Tap the plate to each side, controlled, no momentum.',
    ],
    defaults: { sets: 3, reps: 20, weight: 10 },
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
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    primary: ['Lower Abs', 'Hip Flexors'],
    cues: [
      'Dead hang from the bar, shoulders packed, no swinging.',
      'Tilt pelvis up first — don\'t just lift the legs.',
      'Raise to at least 90°; stop swinging by pausing at the top.',
      'Lower under control over 2–3 seconds.',
    ],
    defaults: { sets: 3, reps: 10, weight: 0 },
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
  },
];

// 4–5 day split biased toward bench progression and balanced pulling.
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

export function suggestedDay(date = new Date()) {
  const map = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 0, 0: 1 };
  return SPLIT[map[date.getDay()]];
}

// Muscle groups, displayed in order. Each group lists the raw `primary`
// terms that exercises tag themselves with, so an exercise like Bench Press
// (primary: Chest, Triceps, Front Delts) appears under Chest, Shoulders,
// and Triceps.
export const MUSCLE_GROUPS = [
  { key: 'chest',     name: 'Chest',     terms: ['Chest', 'Upper Chest', 'Lower Chest'] },
  { key: 'back',      name: 'Back',      terms: ['Lats', 'Mid Back', 'Upper Back'] },
  { key: 'shoulders', name: 'Shoulders', terms: ['Shoulders', 'Front Delts'] },
  { key: 'triceps',   name: 'Triceps',   terms: ['Triceps'] },
  { key: 'biceps',    name: 'Biceps',    terms: ['Biceps'] },
  { key: 'core',      name: 'Core & Abs', terms: ['Core', 'Abs', 'Obliques', 'Lower Abs', 'Hip Flexors'] },
];

export function exercisesForMuscle(groupKey) {
  const group = MUSCLE_GROUPS.find((g) => g.key === groupKey);
  if (!group) return [];
  return EXERCISES.filter((ex) => ex.primary.some((m) => group.terms.includes(m)));
}
