// ---------------------------------------------------------------------------
// GTG exercise taxonomy
// ---------------------------------------------------------------------------
//
// Every exercise in the library is classified against the controlled
// vocabularies in this file. Nothing here knows about three.js or the DOM —
// it is pure data plus a validator, so it can be imported by the app, by the
// build scripts, or by any future tool that wants to generate routines.
//
// The classification answers five separate questions. Keeping them separate
// is what makes automatic routine building possible:
//
//   1. WHAT SHAPE IS THE MOVEMENT?   pattern, plane, force, mechanics, chain
//   2. WHAT DOES IT TRAIN?           muscles.primary / secondary / stabilizers
//   3. HOW IS IT LOADED?             equipment, loading, laterality, metric
//   4. WHAT DOES IT COST YOU?        demands (grip, core, cardio, ... , fatigue)
//   5. HOW DO YOU PROGRAM IT?        level, goals, programming, progression
//
// A common mistake is to fold these together ("kettlebell swing = cardio").
// Here a swing is pattern:hinge + loading:ballistic + goals:[power,
// conditioning] — three orthogonal facts, each of which a routine builder can
// filter on independently.
//
// See docs/EXERCISE-SCHEMA.md for the long-form explanation.

const byId = (list) => new Map(list.map((item) => [item.id, item]));

// ---------------------------------------------------------------------------
// 1. Muscles
// ---------------------------------------------------------------------------
// `group` is the coarse bucket used by the Exercise Library UI; `region`
// supports higher-level balance checks (e.g. "is this week push-heavy?").

export const MUSCLES = [
  // Chest
  { id: 'upper-chest',  name: 'Upper Chest',   group: 'chest',     region: 'anterior-upper', anatomical: 'Pectoralis major, clavicular head' },
  { id: 'chest',        name: 'Chest',         group: 'chest',     region: 'anterior-upper', anatomical: 'Pectoralis major, sternal head' },
  { id: 'lower-chest',  name: 'Lower Chest',   group: 'chest',     region: 'anterior-upper', anatomical: 'Pectoralis major, costal head' },

  // Back
  { id: 'lats',         name: 'Lats',          group: 'back',      region: 'posterior-upper', anatomical: 'Latissimus dorsi' },
  { id: 'mid-back',     name: 'Mid Back',      group: 'back',      region: 'posterior-upper', anatomical: 'Rhomboids, middle trapezius' },
  { id: 'upper-back',   name: 'Upper Back',    group: 'back',      region: 'posterior-upper', anatomical: 'Upper trapezius, levator scapulae' },
  { id: 'teres',        name: 'Teres Major',   group: 'back',      region: 'posterior-upper', anatomical: 'Teres major' },
  { id: 'lower-back',   name: 'Lower Back',    group: 'back',      region: 'posterior-trunk', anatomical: 'Erector spinae, multifidus' },

  // Shoulders
  { id: 'front-delts',  name: 'Front Delts',   group: 'shoulders', region: 'anterior-upper',  anatomical: 'Anterior deltoid' },
  { id: 'side-delts',   name: 'Side Delts',    group: 'shoulders', region: 'lateral-upper',   anatomical: 'Lateral deltoid' },
  { id: 'rear-delts',   name: 'Rear Delts',    group: 'shoulders', region: 'posterior-upper', anatomical: 'Posterior deltoid' },
  { id: 'rotator-cuff', name: 'Rotator Cuff',  group: 'shoulders', region: 'posterior-upper', anatomical: 'Supraspinatus, infraspinatus, teres minor, subscapularis' },
  { id: 'serratus',     name: 'Serratus',      group: 'shoulders', region: 'lateral-trunk',   anatomical: 'Serratus anterior' },

  // Arms
  { id: 'biceps',       name: 'Biceps',        group: 'biceps',    region: 'anterior-upper',  anatomical: 'Biceps brachii' },
  { id: 'brachialis',   name: 'Brachialis',    group: 'biceps',    region: 'anterior-upper',  anatomical: 'Brachialis, brachioradialis' },
  { id: 'triceps',      name: 'Triceps',       group: 'triceps',   region: 'posterior-upper', anatomical: 'Triceps brachii' },
  { id: 'forearms',     name: 'Forearms',      group: 'forearms',  region: 'anterior-upper',  anatomical: 'Wrist and finger flexors' },

  // Core
  { id: 'abs',          name: 'Abs',           group: 'core',      region: 'anterior-trunk',  anatomical: 'Rectus abdominis' },
  { id: 'lower-abs',    name: 'Lower Abs',     group: 'core',      region: 'anterior-trunk',  anatomical: 'Rectus abdominis, lower fibres' },
  { id: 'obliques',     name: 'Obliques',      group: 'core',      region: 'lateral-trunk',   anatomical: 'External and internal obliques' },
  { id: 'deep-core',    name: 'Deep Core',     group: 'core',      region: 'anterior-trunk',  anatomical: 'Transverse abdominis, pelvic floor' },
  { id: 'ql',           name: 'QL',            group: 'core',      region: 'lateral-trunk',   anatomical: 'Quadratus lumborum' },
  { id: 'hip-flexors',  name: 'Hip Flexors',   group: 'core',      region: 'anterior-trunk',  anatomical: 'Iliopsoas, rectus femoris' },

  // Legs
  { id: 'glutes',       name: 'Glutes',        group: 'legs',      region: 'posterior-lower', anatomical: 'Gluteus maximus' },
  { id: 'glute-med',    name: 'Glute Medius',  group: 'legs',      region: 'lateral-lower',   anatomical: 'Gluteus medius and minimus' },
  { id: 'hamstrings',   name: 'Hamstrings',    group: 'legs',      region: 'posterior-lower', anatomical: 'Biceps femoris, semitendinosus, semimembranosus' },
  { id: 'quads',        name: 'Quads',         group: 'legs',      region: 'anterior-lower',  anatomical: 'Quadriceps femoris' },
  { id: 'adductors',    name: 'Adductors',     group: 'legs',      region: 'medial-lower',    anatomical: 'Adductor magnus, longus, brevis' },
  { id: 'calves',       name: 'Calves',        group: 'legs',      region: 'posterior-lower', anatomical: 'Gastrocnemius, soleus' },
];

export const MUSCLE_BY_ID = byId(MUSCLES);

// Display order for the Exercise Library.
export const MUSCLE_GROUPS = [
  { key: 'chest',     name: 'Chest' },
  { key: 'back',      name: 'Back' },
  { key: 'shoulders', name: 'Shoulders' },
  { key: 'biceps',    name: 'Biceps' },
  { key: 'triceps',   name: 'Triceps' },
  { key: 'forearms',  name: 'Forearms & Grip' },
  { key: 'core',      name: 'Core & Abs' },
  { key: 'legs',      name: 'Legs & Glutes' },
];

export function musclesInGroup(groupKey) {
  return MUSCLES.filter((m) => m.group === groupKey);
}

export function muscleName(id) {
  return MUSCLE_BY_ID.get(id)?.name ?? id;
}

export function muscleNames(ids = []) {
  return ids.map(muscleName);
}

// ---------------------------------------------------------------------------
// 2. Movement classification
// ---------------------------------------------------------------------------

// Coarse training bucket — what the exercise is *for* in a session.
export const CATEGORIES = [
  { id: 'push',         name: 'Push',         desc: 'Upper-body pressing.' },
  { id: 'pull',         name: 'Pull',         desc: 'Upper-body pulling.' },
  { id: 'legs',         name: 'Legs',         desc: 'Squat, hinge and lunge patterns driven by the lower body.' },
  { id: 'core',         name: 'Core',         desc: 'Trunk flexion, rotation and anti-movement work.' },
  { id: 'carry',        name: 'Carry',        desc: 'Loaded locomotion — grip, posture and bracing under time.' },
  { id: 'ballistic',    name: 'Ballistic',    desc: 'Explosive, momentum-driven lifts (swing, clean, snatch).' },
  { id: 'full-body',    name: 'Full Body',    desc: 'Chained patterns that load most of the body in one rep.' },
  { id: 'mobility',     name: 'Mobility',     desc: 'Range-of-motion and positional work, loaded lightly.' },
];

// The kinematic shape of the rep. This is the primary axis a routine builder
// balances on: a good day covers complementary patterns, not just muscles.
export const PATTERNS = [
  { id: 'horizontal-press',      name: 'Horizontal Press',      opposes: 'horizontal-pull' },
  { id: 'vertical-press',        name: 'Vertical Press',        opposes: 'vertical-pull' },
  { id: 'horizontal-pull',       name: 'Horizontal Pull',       opposes: 'horizontal-press' },
  { id: 'vertical-pull',         name: 'Vertical Pull',         opposes: 'vertical-press' },
  { id: 'squat',                 name: 'Squat',                 opposes: 'hinge' },
  { id: 'hinge',                 name: 'Hinge',                 opposes: 'squat' },
  { id: 'lunge',                 name: 'Lunge',                 opposes: null },
  { id: 'carry',                 name: 'Carry',                 opposes: null },
  { id: 'rotation',              name: 'Rotation',              opposes: 'anti-rotation' },
  { id: 'anti-extension',        name: 'Anti-Extension',        opposes: 'trunk-flexion' },
  { id: 'anti-rotation',         name: 'Anti-Rotation',         opposes: 'rotation' },
  { id: 'anti-lateral-flexion',  name: 'Anti-Lateral Flexion',  opposes: null },
  { id: 'trunk-flexion',         name: 'Trunk Flexion',         opposes: 'anti-extension' },
  { id: 'hip-flexion',           name: 'Hip Flexion',           opposes: 'hinge' },
  { id: 'elbow-flexion',         name: 'Elbow Flexion',         opposes: 'elbow-extension' },
  { id: 'elbow-extension',       name: 'Elbow Extension',       opposes: 'elbow-flexion' },
  { id: 'get-up',                name: 'Get-Up',                opposes: null },
  { id: 'mobility',              name: 'Mobility',              opposes: null },
];

export const PATTERN_BY_ID = byId(PATTERNS);

export const PLANES = [
  { id: 'sagittal',   name: 'Sagittal',   desc: 'Forward/backward — presses, rows, squats, hinges.' },
  { id: 'frontal',    name: 'Frontal',    desc: 'Side to side — lateral raises, windmills, side bends.' },
  { id: 'transverse', name: 'Transverse', desc: 'Rotational — twists, chops, anti-rotation holds.' },
];

// Which direction the muscles resist. Independent of the pattern: a hinge can
// be a pull (swing) and a squat is a push.
export const FORCES = [
  { id: 'push',   name: 'Push' },
  { id: 'pull',   name: 'Pull' },
  { id: 'static', name: 'Static' },
  { id: 'mixed',  name: 'Mixed' },
];

export const MECHANICS = [
  { id: 'compound',  name: 'Compound',  desc: 'More than one joint drives the load.' },
  { id: 'isolation', name: 'Isolation', desc: 'One joint does the work.' },
];

export const CHAINS = [
  { id: 'open',   name: 'Open Chain',   desc: 'The loaded limb moves freely (curl, press).' },
  { id: 'closed', name: 'Closed Chain', desc: 'The limb is fixed and the body moves (push-up, pull-up, squat).' },
];

export const LATERALITY = [
  { id: 'bilateral',   name: 'Bilateral',   desc: 'Both sides load together.' },
  { id: 'unilateral',  name: 'Unilateral',  desc: 'One side at a time; log per side.' },
  { id: 'alternating', name: 'Alternating', desc: 'Sides trade within the set.' },
  { id: 'offset',      name: 'Offset',      desc: 'Load on one side, both sides working (suitcase carry).' },
];

// How force is expressed over the rep — the single most useful field for
// telling a strength day from a conditioning day.
export const LOADING = [
  { id: 'grind',     name: 'Grind',     desc: 'Slow, continuous tension. Strength and hypertrophy.' },
  { id: 'ballistic', name: 'Ballistic', desc: 'Explosive acceleration then float. Power and conditioning.' },
  { id: 'isometric', name: 'Isometric', desc: 'Hold a position against load.' },
  { id: 'carry',     name: 'Carry',     desc: 'Isometric trunk under locomotion.' },
  { id: 'flow',      name: 'Flow',      desc: 'Slow controlled path through range; mobility work.' },
];

// ---------------------------------------------------------------------------
// 3. Loading & context
// ---------------------------------------------------------------------------

export const EQUIPMENT = [
  { id: 'bodyweight',   name: 'Bodyweight',   home: true,  gym: true },
  { id: 'kettlebell',   name: 'Kettlebell',   home: true,  gym: true },
  { id: 'dumbbell',     name: 'Dumbbell',     home: true,  gym: true },
  { id: 'barbell',      name: 'Barbell',      home: false, gym: true },
  { id: 'plate',        name: 'Weight Plate', home: true,  gym: true },
  { id: 'bench',        name: 'Flat Bench',   home: true,  gym: true },
  { id: 'incline-bench',name: 'Incline Bench',home: false, gym: true },
  { id: 'cable',        name: 'Cable Column', home: false, gym: true },
  { id: 'lat-machine',  name: 'Lat Machine',  home: false, gym: true },
  { id: 'pullup-bar',   name: 'Pull-up Bar',  home: true,  gym: true },
  { id: 'dip-bars',     name: 'Dip Bars',     home: false, gym: true },
  { id: 'mat',          name: 'Floor / Mat',  home: true,  gym: true },
];

export const EQUIPMENT_BY_ID = byId(EQUIPMENT);

// Body position / station. Drives the 3D environment as well as classification.
export const SETUPS = [
  { id: 'standing',       name: 'Standing' },
  { id: 'bench-supine',   name: 'On a flat bench' },
  { id: 'bench-incline',  name: 'On an incline bench' },
  { id: 'floor-supine',   name: 'Lying face up' },
  { id: 'floor-prone',    name: 'Face down / plank' },
  { id: 'floor-seated',   name: 'Seated on the floor' },
  { id: 'seated-machine', name: 'Seated at a station' },
  { id: 'hanging',        name: 'Hanging from a bar' },
  { id: 'suspended',      name: 'Supported on bars' },
];

export const LEVELS = [
  { id: 'beginner',     name: 'Beginner',     order: 1 },
  { id: 'intermediate', name: 'Intermediate', order: 2 },
  { id: 'advanced',     name: 'Advanced',     order: 3 },
];

export const LEVEL_ORDER = { beginner: 1, intermediate: 2, advanced: 3 };

export const GOALS = [
  { id: 'strength',     name: 'Strength',     repRange: [1, 6],   restSec: [150, 300] },
  { id: 'hypertrophy',  name: 'Hypertrophy',  repRange: [6, 15],  restSec: [60, 120] },
  { id: 'power',        name: 'Power',        repRange: [3, 10],  restSec: [60, 180] },
  { id: 'endurance',    name: 'Endurance',    repRange: [12, 30], restSec: [30, 60] },
  { id: 'conditioning', name: 'Conditioning', repRange: [10, 30], restSec: [15, 60] },
  { id: 'mobility',     name: 'Mobility',     repRange: [5, 12],  restSec: [30, 60] },
  { id: 'skill',        name: 'Skill',        repRange: [3, 8],   restSec: [60, 120] },
];

export const GOAL_BY_ID = byId(GOALS);

// How a set is measured. `unit` is what the logger writes into history.
export const METRIC_TYPES = [
  { id: 'reps',     name: 'Reps',     unit: 'lb'  },
  { id: 'time',     name: 'Time',     unit: 'sec' },
  { id: 'distance', name: 'Distance', unit: 'm'   },
];

export const LOAD_TYPES = [
  { id: 'external',            name: 'External load' },
  { id: 'bodyweight',          name: 'Bodyweight' },
  { id: 'weighted-bodyweight', name: 'Bodyweight + load' },
  { id: 'assisted',            name: 'Assisted' },
];

// ---------------------------------------------------------------------------
// 4. Joint actions
// ---------------------------------------------------------------------------
// The mechanical ground truth under `muscles`. Two exercises that share joint
// actions are substitutable even if their equipment differs — this is what
// powers "swap this for something I can do at home".

export const JOINTS = [
  'shoulder', 'scapula', 'elbow', 'wrist', 'spine', 'hip', 'knee', 'ankle',
];

export const JOINT_ACTIONS = [
  'flexion', 'extension', 'abduction', 'adduction',
  'horizontal-adduction', 'horizontal-abduction',
  'internal-rotation', 'external-rotation',
  'lateral-flexion', 'rotation',
  'elevation', 'depression', 'protraction', 'retraction',
  'upward-rotation', 'downward-rotation',
  'plantarflexion', 'dorsiflexion',
  'isometric',
];

// ---------------------------------------------------------------------------
// 5. Demand scores
// ---------------------------------------------------------------------------
// Every score is 1–5 with the same meaning: 1 = negligible, 3 = noticeable,
// 5 = this is the limiting factor. They exist so a routine builder can cap
// total cost (don't stack three 5-grip exercises) rather than guessing.

export const DEMAND_KEYS = [
  { id: 'grip',       name: 'Grip',           desc: 'How likely the hands give out first.' },
  { id: 'core',       name: 'Core',           desc: 'Trunk bracing required to keep position.' },
  { id: 'cardio',     name: 'Cardio',         desc: 'Heart-rate cost of a working set.' },
  { id: 'balance',    name: 'Balance',        desc: 'Stability demand — narrow base, single side, overhead.' },
  { id: 'technical',  name: 'Technique',      desc: 'How much the lift punishes sloppy execution.' },
  { id: 'spinalLoad', name: 'Spinal Load',    desc: 'Compression / shear on the lower back.' },
  { id: 'fatigue',    name: 'Systemic Cost',  desc: 'How much of the day\'s total budget one set spends.' },
];

export const DEMAND_IDS = DEMAND_KEYS.map((d) => d.id);

const DEFAULT_DEMANDS = {
  grip: 1, core: 1, cardio: 1, balance: 1, technical: 1, spinalLoad: 1, fatigue: 2,
};

// ---------------------------------------------------------------------------
// Normalisation + validation
// ---------------------------------------------------------------------------

const ids = (list) => new Set(list.map((x) => x.id));
const VALID = {
  category: ids(CATEGORIES),
  pattern: ids(PATTERNS),
  plane: ids(PLANES),
  force: ids(FORCES),
  mechanics: ids(MECHANICS),
  chain: ids(CHAINS),
  laterality: ids(LATERALITY),
  loading: ids(LOADING),
  equipment: ids(EQUIPMENT),
  setup: ids(SETUPS),
  level: ids(LEVELS),
  goal: ids(GOALS),
  metric: ids(METRIC_TYPES),
  load: ids(LOAD_TYPES),
  muscle: new Set(MUSCLES.map((m) => m.id)),
  joint: new Set(JOINTS),
  action: new Set(JOINT_ACTIONS),
};

function checkEnum(errors, path, value, set) {
  if (value == null) return;
  if (!set.has(value)) errors.push(`${path}: unknown value "${value}"`);
}

function checkEnumList(errors, path, value, set) {
  if (!Array.isArray(value)) {
    errors.push(`${path}: expected an array`);
    return;
  }
  value.forEach((v, i) => checkEnum(errors, `${path}[${i}]`, v, set));
}

/**
 * Validate one exercise definition against the vocabularies above.
 * Returns an array of human-readable problems (empty === valid).
 * Used by scripts/validate-exercises.mjs and by importExercises().
 */
export function validateExercise(ex, { requireRig = false } = {}) {
  const e = [];
  const at = (f) => `${ex?.id || '(no id)'}.${f}`;

  if (!ex || typeof ex !== 'object') return ['not an object'];
  if (!ex.id || !/^[a-z0-9-]+$/.test(ex.id)) e.push(`id: expected kebab-case, got "${ex.id}"`);
  if (!ex.name) e.push(at('name') + ': required');

  checkEnum(e, at('category'), ex.category, VALID.category);
  if (!ex.category) e.push(at('category') + ': required');
  checkEnum(e, at('pattern'), ex.pattern, VALID.pattern);
  if (!ex.pattern) e.push(at('pattern') + ': required');
  checkEnumList(e, at('secondaryPatterns'), ex.secondaryPatterns ?? [], VALID.pattern);
  checkEnumList(e, at('planes'), ex.planes ?? [], VALID.plane);
  if (!ex.planes?.length) e.push(at('planes') + ': at least one plane required');
  checkEnum(e, at('force'), ex.force, VALID.force);
  checkEnum(e, at('mechanics'), ex.mechanics, VALID.mechanics);
  checkEnum(e, at('chain'), ex.chain, VALID.chain);
  checkEnum(e, at('laterality'), ex.laterality, VALID.laterality);
  checkEnum(e, at('loading'), ex.loading, VALID.loading);
  checkEnum(e, at('setup'), ex.setup, VALID.setup);
  checkEnum(e, at('level'), ex.level, VALID.level);
  checkEnumList(e, at('equipment'), ex.equipment ?? [], VALID.equipment);
  if (!ex.equipment?.length) e.push(at('equipment') + ': at least one item required (use "bodyweight")');
  checkEnumList(e, at('equipmentAlt'), ex.equipmentAlt ?? [], VALID.equipment);
  checkEnumList(e, at('goals'), ex.goals ?? [], VALID.goal);
  if (!ex.goals?.length) e.push(at('goals') + ': at least one goal required');

  const m = ex.muscles || {};
  checkEnumList(e, at('muscles.primary'), m.primary ?? [], VALID.muscle);
  checkEnumList(e, at('muscles.secondary'), m.secondary ?? [], VALID.muscle);
  checkEnumList(e, at('muscles.stabilizers'), m.stabilizers ?? [], VALID.muscle);
  if (!m.primary?.length) e.push(at('muscles.primary') + ': at least one prime mover required');

  for (const [i, ja] of (ex.jointActions ?? []).entries()) {
    checkEnum(e, at(`jointActions[${i}].joint`), ja.joint, VALID.joint);
    checkEnum(e, at(`jointActions[${i}].action`), ja.action, VALID.action);
  }

  const d = ex.demands || {};
  for (const key of Object.keys(d)) {
    if (!DEMAND_IDS.includes(key)) e.push(at(`demands.${key}`) + ': unknown demand');
    else if (!(Number.isInteger(d[key]) && d[key] >= 1 && d[key] <= 5)) {
      e.push(at(`demands.${key}`) + ': expected an integer 1–5');
    }
  }

  checkEnum(e, at('metric.type'), ex.metric?.type, VALID.metric);
  checkEnum(e, at('metric.load'), ex.metric?.load, VALID.load);

  if (!ex.cues?.length) e.push(at('cues') + ': at least one coaching cue required');
  if (requireRig && typeof ex.rig !== 'function') e.push(at('rig') + ': required');

  return e;
}

/**
 * Fill in derived and defaulted fields so the rest of the app can read an
 * exercise without defensive checks. Returns a new object; does not mutate.
 *
 * Derived fields:
 *   primary      — display names of the prime movers (used all over the UI)
 *   muscleGroups — every group the exercise touches, primary first
 *   demands      — defaults merged in
 *   defaults     — logger seed values, derived from `programming` if absent
 *   search       — lowercase haystack for the library search
 */
export function normalizeExercise(spec) {
  const muscles = {
    primary: spec.muscles?.primary ?? [],
    secondary: spec.muscles?.secondary ?? [],
    stabilizers: spec.muscles?.stabilizers ?? [],
  };
  const metric = {
    type: 'reps',
    unit: METRIC_TYPES.find((t) => t.id === (spec.metric?.type ?? 'reps'))?.unit ?? 'lb',
    load: 'external',
    perSide: false,
    ...spec.metric,
  };
  const programming = {
    sets: 3,
    reps: 10,
    weight: 0,
    restSec: 90,
    repRange: null,
    tempo: null,
    rpe: null,
    frequencyPerWeek: [1, 3],
    ...spec.programming,
  };
  const progression = {
    regressions: [], progressions: [], variations: [], pairsWith: [],
    ...spec.progression,
  };

  const primaryGroups = [...new Set(muscles.primary.map((id) => MUSCLE_BY_ID.get(id)?.group).filter(Boolean))];
  const allGroups = [...new Set(
    [...muscles.primary, ...muscles.secondary, ...muscles.stabilizers]
      .map((id) => MUSCLE_BY_ID.get(id)?.group).filter(Boolean),
  )];

  const ex = {
    aka: [],
    secondaryPatterns: [],
    planes: ['sagittal'],
    force: 'mixed',
    mechanics: 'compound',
    chain: 'open',
    laterality: 'bilateral',
    loading: 'grind',
    setup: 'standing',
    level: 'beginner',
    equipment: ['bodyweight'],
    equipmentAlt: [],
    goals: ['strength'],
    jointActions: [],
    cues: [],
    mistakes: [],
    breathing: null,
    contraindications: [],
    tempo: 2.4,
    ...spec,
    muscles,
    metric,
    programming,
    progression,
    demands: { ...DEFAULT_DEMANDS, ...spec.demands },
  };

  // Display names of the prime movers. Kept as `primary` because the UI reads
  // it everywhere, and history entries predate the id-based muscle list.
  ex.primary = muscleNames(muscles.primary);
  ex.primaryGroups = primaryGroups;
  ex.muscleGroups = allGroups;

  // Logger seed. `defaults` is what store.js writes into a new session entry.
  ex.defaults = spec.defaults ?? {
    sets: programming.sets,
    reps: programming.reps,
    weight: programming.weight,
    unit: metric.unit,
  };

  ex.search = [
    ex.name, ...(ex.aka ?? []),
    ...ex.primary, ...muscleNames(muscles.secondary),
    ex.pattern, ex.category, ...(ex.equipment ?? []),
  ].join(' ').toLowerCase();

  return ex;
}

/**
 * Normalise + validate in one step. Invalid definitions are still returned
 * (so the app degrades rather than white-screens) but they warn loudly, and
 * scripts/validate-exercises.mjs turns the same warnings into a failed build.
 */
export function defineExercise(spec) {
  const ex = normalizeExercise(spec);
  const errors = validateExercise(ex, { requireRig: true });
  if (errors.length) {
    ex.errors = errors;
    if (typeof console !== 'undefined') {
      console.warn(`[taxonomy] "${spec.id}" has classification problems:\n  ${errors.join('\n  ')}`);
    }
  }
  return ex;
}

// ---------------------------------------------------------------------------
// Human-readable summaries
// ---------------------------------------------------------------------------

const titleOf = (list, id) => list.find((x) => x.id === id)?.name ?? id;

export const patternName  = (id) => titleOf(PATTERNS, id);
export const categoryName = (id) => titleOf(CATEGORIES, id);
export const equipmentName = (id) => titleOf(EQUIPMENT, id);
export const loadingName  = (id) => titleOf(LOADING, id);
export const levelName    = (id) => titleOf(LEVELS, id);
export const goalName     = (id) => titleOf(GOALS, id);
export const planeName    = (id) => titleOf(PLANES, id);

/** One-line classification summary, e.g. "Hinge · Ballistic · Kettlebell · Bilateral". */
export function describeExercise(ex) {
  return [
    patternName(ex.pattern),
    loadingName(ex.loading),
    ex.equipment.map(equipmentName).join(' + '),
    titleOf(LATERALITY, ex.laterality),
  ].join(' · ');
}

/** The pattern that balances this one (horizontal press ↔ horizontal pull). */
export function opposingPattern(patternId) {
  return PATTERN_BY_ID.get(patternId)?.opposes ?? null;
}
