// ---------------------------------------------------------------------------
// Routines: hand-written programs, an automatic routine builder, and the
// import/export path for exercises defined outside this repo.
// ---------------------------------------------------------------------------
//
// This is the payoff for classifying everything. Because each exercise carries
// its pattern, equipment, level, goals and demand scores, a routine is just a
// query: "cover these movement patterns, with this kit, at this level, inside
// this much time, without stacking three grip-5 lifts in a row".

import {
  GOAL_BY_ID, LEVEL_ORDER, opposingPattern, patternName, validateExercise,
  normalizeExercise, describeExercise,
} from './taxonomy.js';
import { EXERCISES, getExercise } from './exercises/index.js';
import { genericRig } from './rig-kit.js';

// ---------------------------------------------------------------------------
// Hand-written programs
// ---------------------------------------------------------------------------

export const PROGRAMS = [
  {
    id: 'bench-135',
    name: 'Bench 135',
    subtitle: 'Upper-body strength split biased toward the bench press',
    goal: 'strength',
    level: 'beginner',
    daysPerWeek: 5,
    equipment: ['barbell', 'dumbbell', 'cable', 'bench', 'incline-bench', 'pullup-bar', 'dip-bars', 'lat-machine', 'bodyweight', 'plate', 'mat'],
    days: [
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
    ],
  },
  {
    id: 'kb-foundations',
    name: 'Kettlebell Foundations',
    subtitle: 'Three days, one bell, the six patterns that matter',
    goal: 'strength',
    level: 'beginner',
    daysPerWeek: 3,
    equipment: ['kettlebell', 'mat'],
    days: [
      {
        id: 'kb-f-1',
        title: 'Day 1 — Hinge & Press',
        subtitle: 'Learn the hinge, own the rack',
        exercises: ['kb-deadlift', 'kb-swing', 'kb-press', 'kb-row'],
      },
      {
        id: 'kb-f-2',
        title: 'Day 2 — Squat & Carry',
        subtitle: 'Legs, grip and a braced midline',
        exercises: ['kb-goblet-squat', 'kb-goblet-reverse-lunge', 'kb-suitcase-carry', 'kb-halo'],
      },
      {
        id: 'kb-f-3',
        title: 'Day 3 — Get-Up & Swing',
        subtitle: 'Slow skill work, then ballistic volume',
        exercises: ['kb-half-get-up', 'kb-swing', 'kb-floor-press', 'kb-farmer-carry'],
      },
    ],
  },
  {
    id: 'kb-conditioning',
    name: 'Kettlebell Conditioning',
    subtitle: 'Ballistic power and work capacity — short, hard sessions',
    goal: 'conditioning',
    level: 'intermediate',
    daysPerWeek: 3,
    equipment: ['kettlebell', 'mat'],
    days: [
      {
        id: 'kb-c-1',
        title: 'Day 1 — Swing Ladder',
        subtitle: 'Hip power on the clock',
        exercises: ['kb-swing', 'kb-single-arm-swing', 'kb-goblet-squat', 'kb-farmer-carry'],
      },
      {
        id: 'kb-c-2',
        title: 'Day 2 — Clean & Press Complex',
        subtitle: 'Grind strength under fatigue',
        exercises: ['kb-clean', 'kb-press', 'kb-renegade-row', 'kb-suitcase-carry'],
      },
      {
        id: 'kb-c-3',
        title: 'Day 3 — Snatch & Thruster',
        subtitle: 'The two hardest lifts, kept short',
        exercises: ['kb-snatch', 'kb-thruster', 'kb-windmill', 'kb-half-get-up'],
      },
    ],
  },
  {
    id: 'hybrid-push-kb',
    name: 'Bench + Bells',
    subtitle: 'Keep the bench progression, add kettlebell legs and conditioning',
    goal: 'hypertrophy',
    level: 'intermediate',
    daysPerWeek: 4,
    equipment: ['barbell', 'dumbbell', 'bench', 'incline-bench', 'pullup-bar', 'kettlebell', 'mat', 'bodyweight'],
    days: [
      {
        id: 'hy-1',
        title: 'Day 1 — Bench + Hinge',
        subtitle: 'Heavy press, kettlebell posterior chain',
        exercises: ['bench-press', 'kb-swing', 'kb-row', 'plank'],
      },
      {
        id: 'hy-2',
        title: 'Day 2 — Pull + Carry',
        subtitle: 'Vertical pulling and grip',
        exercises: ['pullup', 'row', 'kb-farmer-carry', 'bicep-curl'],
      },
      {
        id: 'hy-3',
        title: 'Day 3 — Overhead + Legs',
        subtitle: 'Press strength and a real leg day',
        exercises: ['overhead-press', 'kb-goblet-squat', 'kb-goblet-reverse-lunge', 'kb-half-get-up'],
      },
      {
        id: 'hy-4',
        title: 'Day 4 — Volume + Conditioning',
        subtitle: 'Chest volume then a swing finisher',
        exercises: ['incline-bench', 'pushup', 'kb-thruster', 'kb-swing'],
      },
    ],
  },
];

export const DEFAULT_PROGRAM_ID = 'bench-135';

export const getProgram = (id) =>
  PROGRAMS.find((p) => p.id === id) || PROGRAMS.find((p) => p.id === DEFAULT_PROGRAM_ID);

/** Which day of the given program today lands on. */
export function suggestedDay(program = getProgram(DEFAULT_PROGRAM_ID), date = new Date()) {
  const days = program.days;
  // Monday starts the week; weekends roll back to the front of the program.
  const map = [1, 0, 1, 2, 3, 4, 0]; // Sun..Sat → index hint
  const idx = map[date.getDay()] % days.length;
  return days[idx];
}

// Back-compat: the original hard-coded split.
export const SPLIT = getProgram('bench-135').days;

// ---------------------------------------------------------------------------
// Routine analysis
// ---------------------------------------------------------------------------

/** Rough duration of a set, in seconds, including the rest that follows it. */
export function setSeconds(ex, { reps, restSec } = {}) {
  const r = reps ?? ex.programming.reps;
  const rest = restSec ?? ex.programming.restSec;
  if (ex.metric.type === 'time') return r + rest;
  if (ex.metric.type === 'distance') return r * 1.2 + rest;
  return r * 3.5 + rest;
}

export function estimateMinutes(items) {
  const secs = items.reduce((sum, it) => {
    const ex = it.exercise ?? getExercise(it.id);
    if (!ex) return sum;
    const sets = it.sets ?? ex.programming.sets;
    const perSide = ex.metric.perSide ? 2 : 1;
    return sum + sets * perSide * setSeconds(ex, it);
  }, 0);
  return Math.round(secs / 60);
}

/**
 * What a day actually trains: pattern coverage, push/pull balance, which
 * muscle groups get worked, and where the cost lands. Everything the app shows
 * about a routine — and everything the builder optimises — comes from here.
 */
export function analyseRoutine(ids) {
  const list = ids.map((id) => getExercise(id)).filter(Boolean);
  const patterns = [...new Set(list.map((ex) => ex.pattern))];
  const pushes = list.filter((ex) => ex.force === 'push').length;
  const pulls = list.filter((ex) => ex.force === 'pull').length;
  const groups = {};
  for (const ex of list) {
    for (const g of ex.primaryGroups) groups[g] = (groups[g] || 0) + 1;
  }
  const demandTotal = (key) => list.reduce((n, ex) => n + ex.demands[key], 0);

  const missingCounters = patterns
    .map((p) => opposingPattern(p))
    .filter((p) => p && !patterns.includes(p));

  return {
    exercises: list,
    patterns,
    patternNames: patterns.map(patternName),
    pushPull: { push: pushes, pull: pulls, balanced: Math.abs(pushes - pulls) <= 1 },
    muscleGroups: groups,
    demands: {
      grip: demandTotal('grip'),
      core: demandTotal('core'),
      cardio: demandTotal('cardio'),
      fatigue: demandTotal('fatigue'),
      spinalLoad: demandTotal('spinalLoad'),
    },
    estMinutes: estimateMinutes(list.map((ex) => ({ exercise: ex }))),
    unbalanced: missingCounters.map(patternName),
  };
}

// ---------------------------------------------------------------------------
// Routine builder
// ---------------------------------------------------------------------------

// Pattern templates per goal — the skeleton of a session, filled in from
// whatever the athlete's kit and level allow.
const TEMPLATES = {
  strength: ['hinge', 'horizontal-press', 'horizontal-pull', 'squat', 'anti-extension'],
  hypertrophy: ['horizontal-press', 'horizontal-pull', 'squat', 'vertical-press', 'elbow-flexion', 'trunk-flexion'],
  power: ['hinge', 'squat', 'vertical-press', 'carry'],
  conditioning: ['hinge', 'squat', 'vertical-press', 'horizontal-pull', 'carry'],
  endurance: ['hinge', 'carry', 'anti-extension', 'horizontal-pull'],
  mobility: ['mobility', 'get-up', 'squat', 'anti-lateral-flexion'],
  skill: ['get-up', 'hinge', 'vertical-press', 'anti-lateral-flexion'],
};

function scoreCandidate(ex, { goal, level, avoidDemands }) {
  let score = 0;
  if (ex.goals.includes(goal)) score += 5;
  // Prefer exercises at or just under the athlete's level.
  score += 3 - Math.abs(LEVEL_ORDER[level] - LEVEL_ORDER[ex.level]);
  if (ex.mechanics === 'compound') score += 1;
  // Back off anything that piles onto an already-loaded demand.
  for (const [key, spent] of Object.entries(avoidDemands)) {
    if (spent >= 12) score -= ex.demands[key] ?? 0;
  }
  return score;
}

/**
 * Build a session from the library.
 *
 *   buildRoutine({ equipment: ['kettlebell', 'mat'], level: 'beginner',
 *                  goal: 'strength', minutes: 40 })
 *
 * Returns the chosen exercises with prescribed sets/reps/rest, plus the
 * analysis and any warnings about what could not be covered.
 */
export function buildRoutine({
  equipment = null,          // null = anything in the library
  level = 'intermediate',
  goal = 'strength',
  minutes = 45,
  patterns = null,           // override the goal template
  exclude = [],
  title = null,
} = {}) {
  const kit = equipment ? new Set(equipment) : null;
  const warnings = [];
  const wanted = patterns ?? TEMPLATES[goal] ?? TEMPLATES.strength;

  const pool = EXERCISES.filter((ex) => {
    if (exclude.includes(ex.id)) return false;
    if (LEVEL_ORDER[ex.level] > LEVEL_ORDER[level]) return false;
    if (kit && !ex.equipment.every((eq) => kit.has(eq))) return false;
    return true;
  });

  if (!pool.length) {
    return { title: title ?? 'No routine', exercises: [], warnings: ['Nothing in the library matches that kit and level.'], analysis: analyseRoutine([]) };
  }

  const chosen = [];
  const spentDemands = { grip: 0, core: 0, cardio: 0, fatigue: 0, spinalLoad: 0 };
  let budget = minutes * 60;

  for (const pattern of wanted) {
    const candidates = pool
      .filter((ex) => !chosen.some((c) => c.id === ex.id))
      .filter((ex) => ex.pattern === pattern || ex.secondaryPatterns.includes(pattern))
      .sort((a, b) =>
        scoreCandidate(b, { goal, level, avoidDemands: spentDemands })
        - scoreCandidate(a, { goal, level, avoidDemands: spentDemands }));

    const pick = candidates[0];
    if (!pick) {
      warnings.push(`No ${patternName(pattern).toLowerCase()} available with this kit — pattern skipped.`);
      continue;
    }

    const range = GOAL_BY_ID.get(goal)?.repRange ?? [6, 12];
    const reps = pick.metric.type === 'reps'
      ? Math.round(Math.min(Math.max(pick.programming.reps, range[0]), range[1]))
      : pick.programming.reps;
    const item = {
      id: pick.id,
      exercise: pick,
      sets: pick.programming.sets,
      reps,
      weight: pick.programming.weight,
      restSec: pick.programming.restSec,
      why: `${patternName(pattern)} · ${describeExercise(pick)}`,
    };
    const cost = item.sets * (pick.metric.perSide ? 2 : 1) * setSeconds(pick, item);
    if (cost > budget && chosen.length) {
      warnings.push(`Ran out of time before adding a ${patternName(pattern).toLowerCase()}.`);
      continue;
    }
    budget -= cost;
    for (const key of Object.keys(spentDemands)) spentDemands[key] += pick.demands[key] ?? 0;
    chosen.push(item);
  }

  const analysis = analyseRoutine(chosen.map((c) => c.id));
  if (!analysis.pushPull.balanced) {
    warnings.push(`Push/pull is uneven (${analysis.pushPull.push} push vs ${analysis.pushPull.pull} pull).`);
  }

  return {
    title: title ?? `${goal[0].toUpperCase()}${goal.slice(1)} — ${minutes} min`,
    subtitle: equipment ? equipment.join(' + ') : 'Full library',
    goal,
    level,
    exercises: chosen,
    warnings,
    analysis,
  };
}

// ---------------------------------------------------------------------------
// Import / export
// ---------------------------------------------------------------------------

/**
 * Take exercise definitions from outside this repo (a JSON file, an API, a
 * spreadsheet export) and turn them into library entries.
 *
 * JSON can't carry an animation, so anything without a `rig` gets the generic
 * animation for its movement pattern — classification is enough to show
 * *something* honest on the stage. Pass `rigs: { id: fn }` to supply real ones.
 *
 * Returns { exercises, rejected } — nothing is thrown, so a bad row in an
 * import file can't take the library down with it.
 */
export function importExercises(payload, { rigs = {} } = {}) {
  const rows = Array.isArray(payload) ? payload : payload?.exercises ?? [];
  const exercises = [];
  const rejected = [];

  for (const row of rows) {
    const errors = validateExercise(row);
    if (errors.length) {
      rejected.push({ id: row?.id ?? '(no id)', errors });
      continue;
    }
    const ex = normalizeExercise(row);
    ex.rig = rigs[ex.id] ?? row.rig ?? genericRig(ex.pattern);
    ex.generatedRig = !(rigs[ex.id] || row.rig);
    ex.camera = row.camera ?? { view: '3q' };
    ex.imported = true;
    exercises.push(ex);
  }

  return { exercises, rejected };
}

/**
 * Serialise the library for use elsewhere. Functions (`rig`) are dropped and
 * replaced with `rigRef`, so a round trip through importExercises() rebuilds
 * everything except the bespoke animation.
 */
export function exportExercises(list = EXERCISES) {
  return {
    version: 1,
    exportedCount: list.length,
    exercises: list.map((ex) => {
      const { rig, camera, search, primary, primaryGroups, muscleGroups, errors, ...rest } = ex;
      return { ...rest, rigRef: ex.id, camera };
    }),
  };
}

export function exportProgram(programId) {
  const program = getProgram(programId);
  return {
    version: 1,
    program: {
      ...program,
      days: program.days.map((d) => ({ ...d, analysis: analyseRoutine(d.exercises) })),
    },
  };
}
