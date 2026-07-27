// Exercise database. Each exercise defines an animation `rig(t)` returning a
// pose for the stick figure plus environment/equipment hints. `t` is a phase
// in [0, 1] that loops.
//
// Poses use anatomical sign conventions (see stickFigure.js setPose):
//   spine +forward lean · spineTwist rotates torso · shoulder −front/−π
//   overhead · hip +flexion · knee +flexion · ankle +plantarflex.
//
// Hands can be pinned to equipment with two-bone IK:
//   ikL / ikR: { t: [x,y,z] world hand target, p: [x,y,z] world elbow hint }
// This is what keeps hands exactly ON bars, cables and the floor.
//
// Joint keyframes follow published form references (StrongLifts, ExRx, NASM,
// ACE, StrengthLog et al.) — see docs in the repo README.

const PI = Math.PI;
const lerp = (a, b, t) => a + (b - a) * t;
const wave = (t) => 0.5 - 0.5 * Math.cos(2 * PI * t);

const NEUTRAL = {
  spine: 0, spineTwist: 0, neck: 0,
  lShoulder: 0, rShoulder: 0,
  lShoulderAbduct: 0, rShoulderAbduct: 0,
  lElbow: 0, rElbow: 0,
  lHip: 0, rHip: 0,
  lKnee: 0, rKnee: 0,
  lAnkle: 0, rAnkle: 0,
  rootY: 0, rootZ: 0, rootRotY: 0,
};

function pose(overrides) {
  return { ...NEUTRAL, ...overrides };
}

// Standing legs with feet planted: given hip flex h and knee flex k, returns
// rootY/rootZ offsets that keep the soles on the floor at z ≈ zFoot, plus the
// flat-foot ankle angle.
function plantedLegs(h, k, zFoot = 0.08) {
  const drop = 0.62 * Math.cos(h) + 0.58 * Math.cos(h - k);
  const fwd = 0.62 * Math.sin(h) + 0.58 * Math.sin(h - k);
  return {
    rootY: drop - 1.2,
    rootZ: zFoot - fwd,
    lHip: h, rHip: h, lKnee: k, rKnee: k,
    lAnkle: h - k, rAnkle: h - k,
  };
}

export const EXERCISES = [
  // ========================================================== CHEST / PUSH
  {
    id: 'bench-press',
    name: 'Bench Press',
    category: 'push',
    primary: ['Chest', 'Triceps', 'Front Delts'],
    equipment: 'Barbell · Bench',
    cues: [
      'Plant feet flat, squeeze shoulder blades into the bench, slight arch.',
      'Grip ~1.5× shoulder width; bar starts locked out over the shoulders.',
      'Lower to mid-chest with elbows tucked ~45–70° — forearms stay vertical.',
      'Press up and slightly back so the bar finishes over the shoulder joint.',
    ],
    defaults: { sets: 4, reps: 5, weight: 95 },
    tempo: 3.0,
    rig: (t) => {
      const ph = wave(t);
      // Bar J-curve: mid-chest touch (low, toward feet) → lockout over shoulders.
      const barY = lerp(0.74, 1.52, ph);
      const barZ = lerp(-0.52, -0.72, ph);
      const grip = 0.52;
      return pose({
        lying: true,
        ikL: { t: [grip, barY, barZ], p: [1.2, 0.25, -0.3] },
        ikR: { t: [-grip, barY, barZ], p: [-1.2, 0.25, -0.3] },
        // Feet flat on the floor past the bench end.
        lHip: -0.08, rHip: -0.08,
        lKnee: 0.81, rKnee: 0.81,
        lAnkle: 0.68, rAnkle: 0.68,
        barbell: true,
      });
    },
    camera: { view: 'side', position: [2.8, 1.4, 1.4], target: [0, 0.85, -0.3] },
  },
  {
    id: 'incline-bench',
    name: 'Incline DB Press',
    category: 'push',
    primary: ['Upper Chest', 'Front Delts'],
    equipment: 'Dumbbells · Incline Bench',
    cues: [
      'Bench at ~30–35°; shoulder blades pinned, feet flat.',
      'Start bells at the upper-chest line, elbows just below the bench plane.',
      'Press up and slightly inward — bells converge over the shoulders.',
      'Lower with control until you feel the upper-chest stretch.',
    ],
    defaults: { sets: 3, reps: 8, weight: 30 },
    tempo: 2.6,
    rig: (t) => {
      const ph = wave(t);
      // "A-frame" dumbbell path: wide beside the upper chest → converging
      // over the shoulders. Shoulders sit near (±0.22, 1.16, 0.11).
      const gx = lerp(0.78, 0.3, ph);
      const gy = lerp(1.02, 2.12, ph);
      const gz = lerp(0.38, 0.05, ph);
      return pose({
        incline: true,
        spine: -0.62,
        ikL: { t: [gx, gy, gz], p: [1.4, 0.45, 0.1] },
        ikR: { t: [-gx, gy, gz], p: [-1.4, 0.45, 0.1] },
        // Seated: thighs along the seat, feet flat ahead.
        lHip: 1.6, rHip: 1.6,
        lKnee: 1.05, rKnee: 1.05,
        lAnkle: 0.55, rAnkle: 0.55,
        dumbbells: true,
      });
    },
    camera: { view: '3q', position: [3.3, 1.6, 2.9], target: [0, 1.05, 0.5] },
  },
  {
    id: 'chest-fly',
    name: 'DB Chest Fly',
    category: 'push',
    primary: ['Chest', 'Front Delts'],
    equipment: 'Dumbbells · Bench',
    cues: [
      'Bells together over mid-chest, palms facing each other.',
      'Elbows locked at a slight ~15° bend for the whole set.',
      'Open in a wide arc until upper arms reach torso level — no deeper.',
      'Squeeze the chest to bring the bells together like hugging a barrel.',
    ],
    defaults: { sets: 3, reps: 10, weight: 20 },
    tempo: 3.0,
    rig: (t) => {
      const ph = wave(t);
      // Wide crucifix arc → bells together over mid-chest. Shoulders lie at
      // (±0.22, 0.55, -0.75); the arc stays in the plane above the chest.
      const gx = lerp(1.12, 0.26, ph);
      const gy = lerp(0.68, 1.52, ph);
      return pose({
        lying: true,
        ikL: { t: [gx, gy, -0.62], p: [1.4, 0.1, -0.25] },
        ikR: { t: [-gx, gy, -0.62], p: [-1.4, 0.1, -0.25] },
        lHip: -0.08, rHip: -0.08,
        lKnee: 0.81, rKnee: 0.81,
        lAnkle: 0.68, rAnkle: 0.68,
        dumbbells: true, dbNeutral: true,
      });
    },
    camera: { view: 'front', position: [0.5, 1.8, 3.1], target: [0, 0.8, -0.2] },
  },
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    category: 'push',
    primary: ['Shoulders', 'Triceps', 'Upper Chest'],
    equipment: 'Barbell',
    cues: [
      'Bar racked on the front delts, elbows just in front of the bar.',
      'Brace abs and squeeze glutes — the body stays one rigid column.',
      'Press straight up past the face; head goes back, then through.',
      'Lock out with biceps by the ears, bar over mid-foot.',
    ],
    defaults: { sets: 4, reps: 6, weight: 65 },
    tempo: 2.6,
    rig: (t) => {
      const ph = wave(t);
      const bell = Math.sin(PI * ph); // face-clearing lean mid-press
      const barY = lerp(1.9, 2.98, ph);
      const barZ = lerp(0.22, 0.03, ph);
      return pose({
        spine: -0.06 * bell,
        neck: -0.28 * bell,
        ikL: { t: [0.34, barY, barZ], p: [0.75, 1.45, 0.65] },
        ikR: { t: [-0.34, barY, barZ], p: [-0.75, 1.45, 0.65] },
        barbell: true,
      });
    },
    camera: { view: 'side', position: [3.0, 1.95, 1.2], target: [0, 1.9, 0] },
  },
  {
    id: 'pushup',
    name: 'Push-up',
    category: 'push',
    primary: ['Chest', 'Triceps', 'Core'],
    equipment: 'Bodyweight',
    cues: [
      'Hands slightly wider than shoulders, body one rigid line.',
      'The whole body pivots on the toes — no hip sag or pike.',
      'Lower until the chest grazes the floor, elbows ~45° from the torso.',
      'Press to full lockout, shoulders stacked over the wrists.',
    ],
    defaults: { sets: 3, reps: 12, weight: 0 },
    tempo: 2.0,
    rig: (t) => {
      const ph = wave(t);
      const shoulderH = lerp(0.36, 1.0, ph);
      const theta = Math.asin((shoulderH - 0.14) / 1.95);
      return pose({
        plank: true,
        proneAngle: theta,
        rootY: 0.14,
        ikL: { t: [0.34, 0.05, 0.74], p: [1.3, 0.25, 0.2] },
        ikR: { t: [-0.34, 0.05, 0.74], p: [-1.3, 0.25, 0.2] },
        lAnkle: 0.51 + theta, rAnkle: 0.51 + theta, // toes tucked
      });
    },
    camera: { view: 'side', position: [3.1, 1.0, 0.4], target: [0, 0.55, 0.1] },
  },
  {
    id: 'dip',
    name: 'Triceps Dip',
    category: 'push',
    primary: ['Triceps', 'Lower Chest'],
    equipment: 'Dip Bars',
    cues: [
      'Lock out on the bars, shoulders pressed down away from the ears.',
      'Keep the torso near vertical — elbows track straight back.',
      'Lower until the upper arms are about parallel with the floor.',
      'Press hard to full lockout and squeeze the triceps.',
    ],
    defaults: { sets: 3, reps: 8, weight: 0 },
    tempo: 2.6,
    rig: (t) => {
      const ph = wave(t);
      return pose({
        suspended: true,
        rootY: lerp(-0.2, 0.32, ph),
        rootZ: lerp(0.1, 0.0, ph),
        spine: lerp(0.3, 0.15, ph),
        ikL: { t: [0.35, 1.25, 0.05], p: [0.45, 1.5, -1.5] },
        ikR: { t: [-0.35, 1.25, 0.05], p: [-0.45, 1.5, -1.5] },
        // Knees bent, heels crossed up behind.
        lHip: -0.12, rHip: -0.12,
        lKnee: 1.5, rKnee: 1.5,
        lAnkle: 0.5, rAnkle: 0.5,
      });
    },
    camera: { view: 'side', position: [2.9, 1.7, 1.1], target: [0, 1.45, 0] },
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep Pushdown',
    category: 'push',
    primary: ['Triceps'],
    equipment: 'Cable · Straight Bar',
    cues: [
      'Face the column, slight hinge, shoulder blades set.',
      'Elbows pinned to the ribs — they never drift.',
      'Press the bar down to the thighs; only the forearms move.',
      'Return to ~90° keeping tension — no shoulder roll.',
    ],
    defaults: { sets: 3, reps: 12, weight: 40 },
    tempo: 1.9,
    rig: (t) => {
      const ph = wave(t);
      const elbow = lerp(1.85, 0.1, ph);
      return pose({
        cableStanding: true,
        rootRotY: PI,
        spine: 0.2,
        lShoulder: -0.12, rShoulder: -0.12,
        lShoulderAbduct: 0.08, rShoulderAbduct: 0.08,
        lElbow: elbow, rElbow: elbow,
        lHip: 0.12, rHip: 0.12,
        lKnee: 0.15, rKnee: 0.15,
        lAnkle: -0.03, rAnkle: -0.03,
        handBar: true,
        cables: 'bar', pulley: [0, 2.42, -0.76],
      });
    },
    camera: { view: '3q', position: [2.4, 1.7, -2.5], target: [0, 1.25, -0.15] },
  },
  {
    id: 'overhead-triceps',
    name: 'Overhead Triceps Ext.',
    category: 'push',
    primary: ['Triceps'],
    equipment: 'Dumbbell',
    cues: [
      'Both palms under one vertical dumbbell, arms straight overhead.',
      'Elbows squeezed in beside the ears — they point at the ceiling.',
      'Lower the bell behind your head until forearms pass parallel.',
      'Extend back up without flaring the elbows or arching the back.',
    ],
    defaults: { sets: 3, reps: 10, weight: 30 },
    tempo: 2.4,
    rig: (t) => {
      const ph = wave(t);
      const elbow = lerp(2.05, 0.15, ph);
      return pose({
        spine: 0.03,
        lShoulder: -2.95, rShoulder: -2.95,
        lShoulderAbduct: -0.18, rShoulderAbduct: -0.18, // hands together
        lElbow: elbow, rElbow: elbow,
        singleDB: true,
      });
    },
    camera: { view: 'side', position: [2.9, 2.05, 0.8], target: [0, 1.95, 0] },
  },

  // ================================================================== PULL
  {
    id: 'pullup',
    name: 'Pull-up',
    category: 'pull',
    primary: ['Lats', 'Biceps', 'Upper Back'],
    equipment: 'Pull-up Bar',
    cues: [
      'Dead hang, grip just outside the shoulders, shoulders packed.',
      'Drive the elbows down and back toward the hips.',
      'Slight hollow body — chest rises toward the bar.',
      'Chin clears the bar; lower to a full hang every rep.',
    ],
    defaults: { sets: 3, reps: 6, weight: 0 },
    tempo: 2.6,
    rig: (t) => {
      const ph = wave(t);
      return pose({
        hanging: true,
        rootY: lerp(-0.5, 0.3, ph),
        spine: -0.12 * ph, // chest to the bar
        ikL: { t: [0.42, 2.5, 0], p: [1.4, 1.7, 0.3] },
        ikR: { t: [-0.42, 2.5, 0], p: [-1.4, 1.7, 0.3] },
        lHip: 0.25, rHip: 0.25,
        lKnee: 1.1, rKnee: 1.1,
        lAnkle: 0.5, rAnkle: 0.5,
      });
    },
    camera: { view: '3q', position: [2.1, 1.95, 2.7], target: [0, 1.8, 0] },
  },
  {
    id: 'row',
    name: 'Bent-over Row',
    category: 'pull',
    primary: ['Mid Back', 'Lats', 'Biceps'],
    equipment: 'Barbell',
    cues: [
      'Hinge to ~60° with a flat back, knees soft, bar over mid-foot.',
      'Arms hang straight; body stays frozen in the hinge.',
      'Pull the bar to the lower chest — elbows drive up and back.',
      'Squeeze the blades, lower under control, no torso bounce.',
    ],
    defaults: { sets: 4, reps: 8, weight: 95 },
    tempo: 2.4,
    rig: (t) => {
      const ph = wave(t);
      const barY = lerp(0.6, 1.26, ph);
      const barZ = lerp(0.19, 0.07, ph);
      return pose({
        spine: 0.95,
        rootY: -0.09,
        rootZ: -0.42,
        ikL: { t: [0.4, barY, barZ], p: [1.0, 2.0, -0.4] },
        ikR: { t: [-0.4, barY, barZ], p: [-1.0, 2.0, -0.4] },
        lHip: 0.55, rHip: 0.55,
        lKnee: 0.55, rKnee: 0.55,
        lAnkle: 0, rAnkle: 0,
        barbell: true,
      });
    },
    camera: { view: 'side', position: [3.2, 1.3, 0.5], target: [0, 1.0, 0] },
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    primary: ['Lats', 'Biceps'],
    equipment: 'Cable · Wide Bar',
    cues: [
      'Thighs locked under the pads, wide overhand grip.',
      'Slight backward lean with a lifted chest — don\'t rock.',
      'Pull the bar to the collarbone, elbows driving down and in.',
      'Squeeze the lats, then let the bar climb all the way overhead.',
    ],
    defaults: { sets: 3, reps: 10, weight: 100 },
    tempo: 2.5,
    rig: (t) => {
      const ph = wave(t);
      const barY = lerp(2.2, 1.45, ph);
      const barZ = lerp(-0.08, 0.28, ph);
      return pose({
        latSeated: true,
        rootRotY: PI,
        spine: lerp(-0.26, -0.38, ph),
        ikL: { t: [-0.5, barY, barZ], p: [-1.3, 1.0, 0.35] },
        ikR: { t: [0.5, barY, barZ], p: [1.3, 1.0, 0.35] },
        lHip: 1.62, rHip: 1.62,
        lKnee: 1.5, rKnee: 1.5,
        lAnkle: 0.12, rAnkle: 0.12,
        latBar: true,
        cables: 'bar', pulley: [0, 2.44, -0.9],
      });
    },
    camera: { view: '3q', position: [2.5, 1.85, -2.45], target: [0, 1.5, -0.1] },
  },
  {
    id: 'seated-row',
    name: 'Seated Cable Row',
    category: 'pull',
    primary: ['Mid Back', 'Lats', 'Biceps'],
    equipment: 'Cable · Low Pulley',
    cues: [
      'Feet braced, knees soft, torso tall — an L-shape over the legs.',
      'Reach forward, then row the handle to the navel.',
      'Elbows skim the ribs and finish behind the back.',
      'No torso sway beyond ~10°; blades squeeze at the back.',
    ],
    defaults: { sets: 3, reps: 10, weight: 90 },
    tempo: 2.3,
    rig: (t) => {
      const ph = wave(t);
      const hy = lerp(0.5, 0.62, ph);
      const hz = lerp(-0.42, 0.16, ph);
      return pose({
        rowSeated: true,
        rootRotY: PI,
        spine: lerp(0.14, -0.06, ph),
        ikL: { t: [-0.14, hy, hz], p: [-0.42, 0.55, 1.4] },
        ikR: { t: [0.14, hy, hz], p: [0.42, 0.55, 1.4] },
        lHip: 1.9, rHip: 1.9,
        lKnee: 0.75, rKnee: 0.75,
        lAnkle: -0.42, rAnkle: -0.42,
        handBar: true,
        cables: 'bar', pulley: [0, 0.3, -0.95],
      });
    },
    camera: { view: 'side', position: [3.2, 1.05, -0.3], target: [0, 0.6, -0.2] },
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    category: 'pull',
    primary: ['Rear Delts', 'Upper Back'],
    equipment: 'Cable · Rope',
    cues: [
      'Pulley set at face height; arms extended toward it.',
      'Pull the rope straight at your nose, splitting it apart.',
      'Elbows stay HIGH and wide — finish like a double-biceps pose.',
      'Pause with knuckles by the ears, resist the return.',
    ],
    defaults: { sets: 3, reps: 15, weight: 30 },
    tempo: 2.2,
    rig: (t) => {
      const ph = wave(t);
      const hx = lerp(0.12, 0.55, ph);
      const hy = lerp(1.7, 2.08, ph);
      const hz = lerp(-0.55, 0.28, ph);
      return pose({
        cableStanding: true,
        rootRotY: PI,
        spine: -0.08,
        ikL: { t: [-hx, hy, hz], p: [-1.5, 2.2, 0.5] },
        ikR: { t: [hx, hy, hz], p: [1.5, 2.2, 0.5] },
        lHip: 0.1, rHip: 0.1,
        lKnee: 0.12, rKnee: 0.12,
        lAnkle: -0.02, rAnkle: -0.02,
        cables: 'hands', pulley: [0, 1.62, -0.76],
      });
    },
    camera: { view: '3q', position: [2.4, 2.0, -2.3], target: [0, 1.8, -0.1] },
  },
  {
    id: 'bicep-curl',
    name: 'DB Bicep Curl',
    category: 'pull',
    primary: ['Biceps'],
    equipment: 'Dumbbells',
    cues: [
      'Stand tall, bells at the thighs, palms forward.',
      'Elbows pinned to the ribs — zero swing.',
      'Curl to the front of the shoulders and squeeze.',
      'Lower slowly; don\'t bounce out of the stretch.',
    ],
    defaults: { sets: 3, reps: 10, weight: 25 },
    tempo: 2.0,
    rig: (t) => {
      const ph = wave(t);
      const elbow = lerp(0.06, 2.35, ph);
      return pose({
        lShoulder: lerp(-0.02, -0.15, ph), rShoulder: lerp(-0.02, -0.15, ph),
        lShoulderAbduct: -0.06, rShoulderAbduct: -0.06,
        lElbow: elbow, rElbow: elbow,
        dumbbells: true,
      });
    },
    camera: { view: '3q', position: [2.3, 1.5, 2.4], target: [0, 1.25, 0] },
  },
  {
    id: 'hammer-curl',
    name: 'Alt. Hammer Curl',
    category: 'pull',
    primary: ['Biceps', 'Forearms'],
    equipment: 'Dumbbells',
    cues: [
      'Neutral grip — thumbs up, bells like hammers.',
      'Curl one arm at a time; the other hangs dead straight.',
      'No wrist rotation at any point in the arc.',
      'Alternate in a steady see-saw rhythm, torso still.',
    ],
    defaults: { sets: 3, reps: 12, weight: 25 },
    tempo: 2.6,
    rig: (t) => {
      // Two half-cycles: left arm curls, then right.
      const l = t < 0.5 ? wave(t * 2) : 0;
      const r = t >= 0.5 ? wave((t - 0.5) * 2) : 0;
      return pose({
        lShoulder: -0.02 - 0.13 * l, rShoulder: -0.02 - 0.13 * r,
        lShoulderAbduct: -0.06, rShoulderAbduct: -0.06,
        lElbow: 0.06 + 2.25 * l, rElbow: 0.06 + 2.25 * r,
        dumbbells: true, dbNeutral: true,
      });
    },
    camera: { view: '3q', position: [1.7, 1.5, 2.8], target: [0, 1.25, 0] },
  },

  // ============================================================= SHOULDERS
  {
    id: 'lateral-raise',
    name: 'DB Lateral Raise',
    category: 'push',
    primary: ['Side Delts', 'Shoulders'],
    equipment: 'Dumbbells',
    cues: [
      'Bells at your sides, ~15° elbow bend locked in.',
      'Raise out to the sides in the scapular plane.',
      'Stop when upper arms reach shoulder height — a clean T.',
      'Lower on a 2-second count; nothing below the shoulders moves.',
    ],
    defaults: { sets: 3, reps: 12, weight: 15 },
    tempo: 2.2,
    rig: (t) => {
      const ph = wave(t);
      // Frontal-plane arc from beside the thighs up to a clean T at
      // shoulder height (slightly forward — scapular plane).
      const ang = lerp(0.12, 1.42, ph);
      const gx = 0.24 + 0.98 * Math.sin(ang);
      const gy = 2.0 - 0.98 * Math.cos(ang);
      return pose({
        ikL: { t: [gx, gy, 0.16], p: [gx + 0.3, gy - 0.8, -0.35] },
        ikR: { t: [-gx, gy, 0.16], p: [-gx - 0.3, gy - 0.8, -0.35] },
        dumbbells: true,
      });
    },
    camera: { view: 'front', position: [0.3, 1.95, 3.4], target: [0, 1.5, 0] },
  },

  // ================================================================== LEGS
  {
    id: 'squat',
    name: 'Barbell Back Squat',
    category: 'legs',
    primary: ['Quads', 'Glutes', 'Core'],
    equipment: 'Barbell',
    cues: [
      'Bar on the upper traps, hands just outside the shoulders.',
      'Hips travel down AND back while the knees drive forward-out.',
      'Hit depth — hip crease below the kneecap, heels glued down.',
      'Drive up; the bar tracks a vertical line over mid-foot.',
    ],
    defaults: { sets: 4, reps: 6, weight: 115 },
    tempo: 3.4,
    rig: (t) => {
      const ph = wave(t);
      const h = lerp(0.06, 1.92, ph);
      const k = lerp(0.08, 2.1, ph);
      const s = lerp(0.05, 0.62, ph);
      const legs = plantedLegs(h, k, 0.1);
      // Bar rides on the traps: chest + local (0, 0.06, -0.10). Pin the
      // hands onto it just outside the shoulders.
      const hipY = 1.25 + legs.rootY;
      const chestY = hipY + 0.75 * Math.cos(s);
      const chestZ = legs.rootZ + 0.75 * Math.sin(s);
      const barY = chestY + 0.06 * Math.cos(s) + 0.10 * Math.sin(s);
      const barZ = chestZ + 0.06 * Math.sin(s) - 0.10 * Math.cos(s);
      return pose({
        ...legs,
        spine: s,
        ikL: { t: [0.55, barY, barZ], p: [0.9, barY - 0.7, barZ - 0.4] },
        ikR: { t: [-0.55, barY, barZ], p: [-0.9, barY - 0.7, barZ - 0.4] },
        barbellOnBack: true,
      });
    },
    camera: { view: '3q', position: [2.7, 1.45, 2.5], target: [0, 0.95, 0] },
  },
  {
    id: 'deadlift',
    name: 'Deadlift',
    category: 'legs',
    primary: ['Hamstrings', 'Glutes', 'Lower Back'],
    equipment: 'Barbell',
    cues: [
      'Bar over mid-foot, shins nearly touching it, arms dead straight.',
      'Flat back at ~45–55°, shoulders just in front of the bar.',
      'Push the floor away — bar drags a straight line up the legs.',
      'Lock out tall at the hips. No lean-back, no shrug.',
    ],
    defaults: { sets: 3, reps: 5, weight: 135 },
    tempo: 3.2,
    rig: (t) => {
      const ph = wave(t);
      const h = lerp(1.15, 0.04, ph);
      const k = lerp(1.05, 0.06, ph);
      const s = lerp(1.08, 0.04, ph);
      const legs = plantedLegs(h, k, 0.1);
      return pose({
        ...legs,
        spine: s,
        lShoulder: -s - 0.02, rShoulder: -s - 0.02, // arms hang plumb
        lShoulderAbduct: 0.12, rShoulderAbduct: 0.12,
        lElbow: 0.04, rElbow: 0.04,
        barbell: true,
      });
    },
    camera: { view: 'side', position: [3.3, 1.2, 0.6], target: [0, 0.9, 0] },
  },
  {
    id: 'rdl',
    name: 'Romanian Deadlift',
    category: 'legs',
    primary: ['Hamstrings', 'Glutes', 'Lower Back'],
    equipment: 'Barbell',
    cues: [
      'Start standing, bar at the hips, knees soft ~15° — they stay there.',
      'Push the hips straight back; shins stay vertical.',
      'Bar slides down the thighs to just below the knees.',
      'Feel the hamstring stretch, then snap the hips forward to stand.',
    ],
    defaults: { sets: 3, reps: 8, weight: 115 },
    tempo: 3.0,
    rig: (t) => {
      const ph = wave(t);
      const h = lerp(0.08, 0.42, ph);
      const k = 0.28;
      const s = lerp(0.05, 1.0, ph);
      const legs = plantedLegs(h, k, 0.06);
      return pose({
        ...legs,
        spine: s,
        // Lats pull the bar in against the legs.
        lShoulder: -s - 0.27 * ph, rShoulder: -s - 0.27 * ph,
        lShoulderAbduct: 0.12, rShoulderAbduct: 0.12,
        lElbow: 0.04, rElbow: 0.04,
        barbell: true,
      });
    },
    camera: { view: 'side', position: [3.3, 1.25, 0.5], target: [0, 1.0, 0] },
  },
  {
    id: 'split-squat',
    name: 'DB Split Squat',
    category: 'legs',
    primary: ['Quads', 'Glutes'],
    equipment: 'Dumbbells',
    cues: [
      'Staggered stance, rear heel popped up — feet never move.',
      'Drop straight down like an elevator, torso tall.',
      'Both knees fold to ~90°; rear knee kisses the floor.',
      'Drive through the front heel to stand. All reps, then switch legs.',
    ],
    defaults: { sets: 3, reps: 10, weight: 30 },
    tempo: 2.8,
    rig: (t) => {
      const ph = wave(t);
      return pose({
        rootY: lerp(-0.083, -0.484, ph),
        rootZ: lerp(0.066, -0.155, ph),
        spine: 0.1,
        // Front (left) leg: shin stays vertical, thigh to horizontal.
        lHip: lerp(0.5, 1.35, ph),
        lKnee: lerp(0.35, 1.35, ph),
        lAnkle: lerp(-0.15, 0.0, ph),
        // Rear (right) leg: knee drops under the hips, heel up on the ball.
        rHip: lerp(-0.556, 0.155, ph),
        rKnee: lerp(0.15, 1.735, ph),
        rAnkle: lerp(1.67, 2.4, ph),
        dumbbells: true,
      });
    },
    camera: { view: 'side', position: [3.2, 1.15, 0.4], target: [0, 0.85, -0.05] },
  },
  {
    id: 'glute-bridge',
    name: 'Glute Bridge',
    category: 'legs',
    primary: ['Glutes', 'Hamstrings'],
    equipment: 'Barbell (optional)',
    cues: [
      'Shoulders stay on the floor, heels pulled in, feet flat.',
      'Drive through the heels — hips press straight up.',
      'Lock out into one straight line: shoulders → hips → knees.',
      'Squeeze the glutes a beat at the top, lower with control.',
    ],
    defaults: { sets: 3, reps: 12, weight: 45 },
    tempo: 2.4,
    rig: (t) => {
      const ph = wave(t);
      const beta = 0.36 * ph;
      return pose({
        lyingFloor: true,
        rootRotX: -PI / 2 - beta,
        rootY: 1.95 * Math.sin(beta),
        rootZ: 1.95 * (Math.cos(beta) - 1),
        lHip: lerp(0.85, 0.0, ph), rHip: lerp(0.85, 0.0, ph),
        lKnee: lerp(2.12, 1.81, ph), rKnee: lerp(2.12, 1.81, ph),
        lAnkle: lerp(0.3, 0.11, ph), rAnkle: lerp(0.3, 0.11, ph),
        // Hands steady the bar on the hip crease.
        lShoulder: -0.5, rShoulder: -0.5,
        lShoulderAbduct: 0.35, rShoulderAbduct: 0.35,
        lElbow: 0.55, rElbow: 0.55,
        barbellOnHips: true,
      });
    },
    camera: { view: 'side', position: [3.1, 0.95, 0.1], target: [0, 0.45, 0] },
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    category: 'legs',
    primary: ['Calves'],
    equipment: 'Dumbbells',
    cues: [
      'Stand tall with bells at your sides — the body is one rigid column.',
      'Press up onto the balls of the feet as high as possible.',
      'Pause a beat at the top; heels never touch down early.',
      'Lower on a slow 2–3 count to a full stretch.',
    ],
    defaults: { sets: 4, reps: 15, weight: 40 },
    tempo: 1.9,
    rig: (t) => {
      const ph = wave(t);
      const a = 0.5 * ph;
      return pose({
        rootY: 0.19 * Math.sin(a),
        lAnkle: a, rAnkle: a,
        lKnee: 0.03, rKnee: 0.03,
        lHip: 0.03, rHip: 0.03,
        dumbbells: true,
      });
    },
    camera: { view: 'side', position: [2.9, 1.1, 1.3], target: [0, 0.9, 0] },
  },

  // ================================================================== CORE
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    primary: ['Core', 'Shoulders'],
    equipment: 'Bodyweight',
    cues: [
      'Forearms flat, elbows under the shoulders.',
      'One dead-straight line from head through heels.',
      'Squeeze glutes, brace abs — no sag, no pike.',
      'Breathe slow and even through the hold.',
    ],
    defaults: { sets: 3, reps: 60, weight: 0, unit: 'sec' },
    tempo: 4.0,
    rig: (t) => {
      const breathe = 0.012 * Math.sin(2 * PI * t);
      const shoulderH = 0.55 + breathe;
      const theta = Math.asin((shoulderH - 0.14) / 1.95);
      return pose({
        plank: true,
        proneAngle: theta,
        rootY: 0.14,
        // Hands ahead of the elbows, forearms on the mat.
        ikL: { t: [0.28, 0.06, 1.32], p: [0.29, -0.5, 0.88] },
        ikR: { t: [-0.28, 0.06, 1.32], p: [-0.29, -0.5, 0.88] },
        lAnkle: 0.51 + theta, rAnkle: 0.51 + theta,
      });
    },
    camera: { view: 'side', position: [3.2, 0.9, 0.3], target: [0, 0.5, 0.2] },
  },
  {
    id: 'crunch',
    name: 'Crunch',
    category: 'core',
    primary: ['Abs'],
    equipment: 'Bodyweight',
    cues: [
      'Knees bent, feet flat, hands behind the ears.',
      'Curl the ribs toward the pelvis — blades lift, lower back stays down.',
      'It\'s a curl, not a sit-up: ~30° of trunk flexion.',
      'Exhale at the top, 2-count on the way down.',
    ],
    defaults: { sets: 3, reps: 15, weight: 0 },
    tempo: 1.8,
    rig: (t) => {
      const ph = wave(t);
      return pose({
        lyingFloor: true,
        spine: lerp(0.04, 0.55, ph),
        // Hands behind the head, elbows flared.
        lShoulder: -2.6, rShoulder: -2.6,
        lShoulderAbduct: 0.85, rShoulderAbduct: 0.85,
        lElbow: 2.3, rElbow: 2.3,
        // Bent-knee tent, feet flat.
        lHip: 0.85, rHip: 0.85,
        lKnee: 2.12, rKnee: 2.12,
        lAnkle: 0.3, rAnkle: 0.3,
      });
    },
    camera: { view: 'side', position: [3.0, 1.05, 0.2], target: [0, 0.45, 0] },
  },
  {
    id: 'russian-twist',
    name: 'Russian Twist',
    category: 'core',
    primary: ['Obliques', 'Abs'],
    equipment: 'Weight Plate',
    cues: [
      'Sit in a V — torso reclined ~45°, knees up, heels light.',
      'Hold the plate in front of the sternum, arms long.',
      'Rotate the torso as one unit — legs stay frozen.',
      'Sweep the plate hip to hip with control, no momentum.',
    ],
    defaults: { sets: 3, reps: 20, weight: 10 },
    tempo: 2.4,
    rig: (t) => {
      const swing = Math.sin(2 * PI * t) * 0.72;
      return pose({
        seatedFloor: true,
        rootRotX: -0.55,
        rootY: -0.963,
        rootZ: 0.627,
        spineTwist: swing,
        lShoulder: -0.95, rShoulder: -0.95,
        lShoulderAbduct: 0.05, rShoulderAbduct: 0.05,
        lElbow: 0.55, rElbow: 0.55,
        lHip: 1.71, rHip: 1.71,
        lKnee: 0.99, rKnee: 0.99,
        lAnkle: -0.3, rAnkle: -0.3,
        plate: true,
      });
    },
    camera: { view: '3q', position: [2.3, 1.75, 2.5], target: [0, 0.65, 0] },
  },
  {
    id: 'hanging-leg-raise',
    name: 'Hanging Leg Raise',
    category: 'core',
    primary: ['Lower Abs', 'Hip Flexors'],
    equipment: 'Pull-up Bar',
    cues: [
      'Dead hang, arms straight, zero swing.',
      'Raise straight legs to at least horizontal — a crisp L.',
      'Finish with a small pelvic curl, tailbone tucking forward.',
      'Lower over 2–3 seconds; the torso never kips.',
    ],
    defaults: { sets: 3, reps: 10, weight: 0 },
    tempo: 2.8,
    rig: (t) => {
      const ph = wave(t);
      const hip = lerp(0.08, 1.75, ph);
      return pose({
        hanging: true,
        rootY: -0.48,
        spine: -0.14 * ph, // posterior tilt at the top
        ikL: { t: [0.3, 2.5, 0], p: [0.8, 1.9, -0.4] },
        ikR: { t: [-0.3, 2.5, 0], p: [-0.8, 1.9, -0.4] },
        lHip: hip, rHip: hip,
        lKnee: 0.15, rKnee: 0.15,
        lAnkle: 0.55, rAnkle: 0.55,
      });
    },
    camera: { view: 'side', position: [3.4, 1.75, 0.9], target: [0, 1.55, 0.2] },
  },
  {
    id: 'mountain-climber',
    name: 'Mountain Climbers',
    category: 'core',
    primary: ['Core', 'Hip Flexors', 'Shoulders'],
    equipment: 'Bodyweight',
    cues: [
      'High plank — hands under shoulders, arms locked.',
      'Drive one knee to the chest, then swap in a quick scissor.',
      'Hips stay level with the shoulders — no bouncing.',
      'It\'s a sprint against the floor: cadence, not range.',
    ],
    defaults: { sets: 3, reps: 30, weight: 0, unit: 'sec' },
    tempo: 1.2,
    rig: (t) => {
      const dl = 0.5 + 0.5 * Math.sin(2 * PI * t);
      const dr = 1 - dl;
      const theta = Math.asin((1.0 - 0.14) / 1.95);
      return pose({
        plank: true,
        proneAngle: theta,
        rootY: 0.14,
        ikL: { t: [0.3, 0.05, 0.75], p: [1.3, 0.25, 0.2] },
        ikR: { t: [-0.3, 0.05, 0.75], p: [-1.3, 0.25, 0.2] },
        lHip: lerp(0.06, 1.85, dl), lKnee: lerp(0.08, 1.9, dl),
        rHip: lerp(0.06, 1.85, dr), rKnee: lerp(0.08, 1.9, dr),
        lAnkle: lerp(0.51 + theta, 0.7, dl), rAnkle: lerp(0.51 + theta, 0.7, dr),
      });
    },
    camera: { view: 'side', position: [2.9, 1.25, 1.4], target: [0, 0.65, 0] },
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    category: 'core',
    primary: ['Core', 'Abs'],
    equipment: 'Bodyweight',
    cues: [
      'On your back: arms to the ceiling, hips and knees at 90/90.',
      'Lower one arm overhead while the OPPOSITE leg reaches long.',
      'Hover both just off the floor — lower back stays welded down.',
      'Return slowly and switch sides. Slow is the point.',
    ],
    defaults: { sets: 3, reps: 10, weight: 0 },
    tempo: 3.6,
    rig: (t) => {
      const half = t < 0.5;
      const u = wave((t % 0.5) * 2);
      // Extending pair: one arm overhead + opposite leg long.
      const armExt = lerp(-PI / 2, -2.9, u);
      const hipExt = lerp(1.57, 0.22, u);
      const kneeExt = lerp(1.57, 0.1, u);
      return pose({
        lyingFloor: true,
        lShoulder: half ? -PI / 2 : armExt,
        rShoulder: half ? armExt : -PI / 2,
        lElbow: 0.05, rElbow: 0.05,
        lShoulderAbduct: 0.12, rShoulderAbduct: 0.12,
        lHip: half ? hipExt : 1.57, lKnee: half ? kneeExt : 1.57,
        rHip: half ? 1.57 : hipExt, rKnee: half ? 1.57 : kneeExt,
        lAnkle: 0.25, rAnkle: 0.25,
      });
    },
    camera: { view: 'side', position: [3.0, 1.15, 0.4], target: [0, 0.5, 0.15] },
  },
];

// ---------------------------------------------------------------------------
// Weekly split — PPL×2 + core day, biased toward the bench goal.
// ---------------------------------------------------------------------------

export const SPLIT = [
  {
    id: 'push-a',
    title: 'Push A — Bench Strength',
    subtitle: 'Heavy pressing, triceps to lock it out',
    exercises: ['bench-press', 'incline-bench', 'dip', 'overhead-triceps', 'plank'],
  },
  {
    id: 'pull-a',
    title: 'Pull A — Back Width',
    subtitle: 'Vertical pulling & biceps',
    exercises: ['pullup', 'row', 'seated-row', 'bicep-curl', 'hanging-leg-raise'],
  },
  {
    id: 'legs-a',
    title: 'Legs A — Squat Focus',
    subtitle: 'Quads, glutes, hamstrings',
    exercises: ['squat', 'rdl', 'split-squat', 'calf-raise', 'crunch'],
  },
  {
    id: 'push-b',
    title: 'Push B — Bench Volume',
    subtitle: 'Hypertrophy pressing & shoulders',
    exercises: ['bench-press', 'pushup', 'chest-fly', 'overhead-press', 'lateral-raise'],
  },
  {
    id: 'pull-b',
    title: 'Pull B — Deadlift & Rear',
    subtitle: 'Hinge strength, lats, rear delts',
    exercises: ['deadlift', 'lat-pulldown', 'face-pull', 'hammer-curl', 'russian-twist'],
  },
  {
    id: 'legs-b',
    title: 'Legs B — Posterior Chain',
    subtitle: 'Glutes, calves & conditioning',
    exercises: ['glute-bridge', 'squat', 'calf-raise', 'mountain-climber', 'hanging-leg-raise'],
  },
  {
    id: 'core-day',
    title: 'Core & Reset',
    subtitle: 'Midline work / active recovery',
    exercises: ['plank', 'dead-bug', 'mountain-climber', 'russian-twist', 'crunch'],
  },
];

export function getExercise(id) {
  return EXERCISES.find((e) => e.id === id);
}

export function getDay(id) {
  return SPLIT.find((d) => d.id === id);
}

// Mon→Push A … Sun→Core & Reset
export function suggestedDay(date = new Date()) {
  const map = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
  return SPLIT[map[date.getDay()]];
}

// Muscle groups, displayed in order. Each group lists the raw `primary`
// terms that exercises tag themselves with.
export const MUSCLE_GROUPS = [
  { key: 'chest',     name: 'Chest',     terms: ['Chest', 'Upper Chest', 'Lower Chest'] },
  { key: 'back',      name: 'Back',      terms: ['Lats', 'Mid Back', 'Upper Back', 'Lower Back'] },
  { key: 'shoulders', name: 'Shoulders', terms: ['Shoulders', 'Front Delts', 'Side Delts', 'Rear Delts'] },
  { key: 'triceps',   name: 'Triceps',   terms: ['Triceps'] },
  { key: 'biceps',    name: 'Biceps',    terms: ['Biceps', 'Forearms'] },
  { key: 'legs',      name: 'Legs',      terms: ['Quads', 'Hamstrings', 'Glutes', 'Calves'] },
  { key: 'core',      name: 'Core & Abs', terms: ['Core', 'Abs', 'Obliques', 'Lower Abs', 'Hip Flexors'] },
];

export function exercisesForMuscle(groupKey) {
  const group = MUSCLE_GROUPS.find((g) => g.key === groupKey);
  if (!group) return [];
  return EXERCISES.filter((ex) => ex.primary.some((m) => group.terms.includes(m)));
}
