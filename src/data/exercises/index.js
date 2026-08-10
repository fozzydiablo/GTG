// The exercise library, assembled from the per-equipment modules and indexed
// for the queries the app and the routine builder actually make.

import {
  MUSCLE_GROUPS, MUSCLE_BY_ID, EQUIPMENT, PATTERNS, LEVELS, GOALS, LEVEL_ORDER,
  equipmentName, patternName, levelName, goalName,
} from '../taxonomy.js';
import { GYM_EXERCISES } from './gym.js';
import { KETTLEBELL_EXERCISES } from './kettlebell.js';

export const EXERCISES = [...GYM_EXERCISES, ...KETTLEBELL_EXERCISES];

const BY_ID = new Map(EXERCISES.map((ex) => [ex.id, ex]));

export function getExercise(id) {
  return BY_ID.get(id);
}

export function getExercises(ids = []) {
  return ids.map((id) => BY_ID.get(id)).filter(Boolean);
}

// --- muscle queries --------------------------------------------------------

/** Exercises whose PRIME MOVERS land in a muscle group. */
export function exercisesForMuscle(groupKey) {
  return EXERCISES.filter((ex) => ex.primaryGroups.includes(groupKey));
}

/** Exercises that touch a muscle group at all, including as a stabilizer. */
export function exercisesTouchingMuscle(groupKey) {
  return EXERCISES.filter((ex) => ex.muscleGroups.includes(groupKey));
}

/** Every exercise where a specific muscle id shows up, with the role it plays. */
export function rolesForMuscle(muscleId) {
  const out = [];
  for (const ex of EXERCISES) {
    if (ex.muscles.primary.includes(muscleId)) out.push({ exercise: ex, role: 'primary' });
    else if (ex.muscles.secondary.includes(muscleId)) out.push({ exercise: ex, role: 'secondary' });
    else if (ex.muscles.stabilizers.includes(muscleId)) out.push({ exercise: ex, role: 'stabilizer' });
  }
  return out;
}

// --- other axes ------------------------------------------------------------

export const exercisesForEquipment = (id) =>
  EXERCISES.filter((ex) => ex.equipment.includes(id));

export const exercisesForPattern = (id) =>
  EXERCISES.filter((ex) => ex.pattern === id || ex.secondaryPatterns.includes(id));

export const exercisesForGoal = (id) => EXERCISES.filter((ex) => ex.goals.includes(id));

export const exercisesForLevel = (id) =>
  EXERCISES.filter((ex) => LEVEL_ORDER[ex.level] <= LEVEL_ORDER[id]);

/** Everything you can train with a given kit, e.g. ['kettlebell', 'mat']. */
export function exercisesWithKit(available = []) {
  const kit = new Set(available);
  return EXERCISES.filter((ex) => ex.equipment.every((eq) => kit.has(eq)));
}

export function searchExercises(query) {
  const q = query.trim().toLowerCase();
  if (!q) return EXERCISES;
  return EXERCISES.filter((ex) => ex.search.includes(q));
}

// --- library facets --------------------------------------------------------
//
// The Exercise Library groups by one of these at a time. Each facet knows how
// to list its buckets and which exercises land in each, so the UI stays a thin
// renderer over the taxonomy instead of hard-coding muscle groups.

export const FACETS = [
  {
    key: 'muscle',
    name: 'Muscle',
    buckets: () => MUSCLE_GROUPS.map((g) => ({ key: g.key, name: g.name })),
    match: (bucketKey) => exercisesForMuscle(bucketKey),
  },
  {
    key: 'equipment',
    name: 'Equipment',
    buckets: () => EQUIPMENT
      .map((e) => ({ key: e.id, name: equipmentName(e.id) }))
      .filter((b) => exercisesForEquipment(b.key).length),
    match: (bucketKey) => exercisesForEquipment(bucketKey),
  },
  {
    key: 'pattern',
    name: 'Movement',
    buckets: () => PATTERNS
      .map((p) => ({ key: p.id, name: patternName(p.id) }))
      .filter((b) => exercisesForPattern(b.key).length),
    match: (bucketKey) => exercisesForPattern(bucketKey),
  },
  {
    key: 'goal',
    name: 'Goal',
    buckets: () => GOALS
      .map((g) => ({ key: g.id, name: goalName(g.id) }))
      .filter((b) => exercisesForGoal(b.key).length),
    match: (bucketKey) => exercisesForGoal(bucketKey),
  },
  {
    key: 'level',
    name: 'Level',
    buckets: () => LEVELS.map((l) => ({ key: l.id, name: levelName(l.id) })),
    match: (bucketKey) => EXERCISES.filter((ex) => ex.level === bucketKey),
  },
];

export const getFacet = (key) => FACETS.find((f) => f.key === key);

// --- library-wide stats (used by the docs page and the routine builder) ----

export function libraryStats() {
  const count = (list, pick) => {
    const tally = new Map();
    for (const ex of list) for (const v of [pick(ex)].flat()) tally.set(v, (tally.get(v) || 0) + 1);
    return Object.fromEntries([...tally].sort((a, b) => b[1] - a[1]));
  };
  return {
    total: EXERCISES.length,
    byCategory: count(EXERCISES, (ex) => ex.category),
    byPattern: count(EXERCISES, (ex) => ex.pattern),
    byEquipment: count(EXERCISES, (ex) => ex.equipment),
    byLevel: count(EXERCISES, (ex) => ex.level),
    byMuscleGroup: count(EXERCISES, (ex) => ex.primaryGroups),
    unclassified: EXERCISES.filter((ex) => ex.errors?.length).map((ex) => ex.id),
  };
}

export { MUSCLE_GROUPS, MUSCLE_BY_ID };
