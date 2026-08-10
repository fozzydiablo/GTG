// Validate the exercise library against the taxonomy.
//
// Usage: npm run validate
//
// Checks every exercise against the controlled vocabularies in
// src/data/taxonomy.js, verifies that cross-references (progressions,
// variations, program days) point at exercises that exist, and prints a
// coverage summary so gaps in the library are obvious.

import { EXERCISES, libraryStats, getExercise } from '../src/data/exercises/index.js';
import { validateExercise, PATTERNS, MUSCLE_GROUPS } from '../src/data/taxonomy.js';
import { PROGRAMS, analyseRoutine } from '../src/data/routines.js';

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  ✗ ${msg}`); };

console.log(`Validating ${EXERCISES.length} exercises...\n`);

// 1. Schema + vocabulary
for (const ex of EXERCISES) {
  const errors = validateExercise(ex, { requireRig: true });
  for (const e of errors) fail(e);
}

// 2. Rigs must produce a finite pose at every point in the loop.
for (const ex of EXERCISES) {
  for (let i = 0; i <= 20; i += 1) {
    const p = ex.rig(i / 20);
    if (!p || typeof p !== 'object') {
      fail(`${ex.id}: rig(${i / 20}) did not return a pose`);
      break;
    }
    const bad = Object.entries(p).find(([, v]) => typeof v === 'number' && !Number.isFinite(v));
    if (bad) {
      fail(`${ex.id}: rig(${i / 20}) produced a non-finite ${bad[0]}`);
      break;
    }
  }
}

// 3. Cross-references
const REF_FIELDS = ['regressions', 'progressions', 'variations', 'pairsWith'];
for (const ex of EXERCISES) {
  for (const field of REF_FIELDS) {
    for (const ref of ex.progression[field] ?? []) {
      if (!getExercise(ref)) fail(`${ex.id}.progression.${field}: "${ref}" is not an exercise id`);
      if (ref === ex.id) fail(`${ex.id}.progression.${field}: references itself`);
    }
  }
}

// 4. Programs
for (const program of PROGRAMS) {
  if (program.days.length !== program.daysPerWeek) {
    fail(`program ${program.id}: daysPerWeek is ${program.daysPerWeek} but ${program.days.length} days are defined`);
  }
  for (const day of program.days) {
    for (const id of day.exercises) {
      const ex = getExercise(id);
      if (!ex) { fail(`program ${program.id}/${day.id}: unknown exercise "${id}"`); continue; }
      if (program.equipment && !ex.equipment.every((eq) => program.equipment.includes(eq))) {
        fail(`program ${program.id}/${day.id}: ${id} needs ${ex.equipment.join('+')}, which the program's kit doesn't list`);
      }
    }
  }
}

// 5. Coverage report
const stats = libraryStats();
console.log('Library coverage');
console.log('  by category :', JSON.stringify(stats.byCategory));
console.log('  by level    :', JSON.stringify(stats.byLevel));
console.log('  by equipment:', JSON.stringify(stats.byEquipment));
console.log('  by muscle   :', JSON.stringify(stats.byMuscleGroup));

const uncoveredPatterns = PATTERNS
  .filter((p) => !EXERCISES.some((ex) => ex.pattern === p.id))
  .map((p) => p.id);
if (uncoveredPatterns.length) console.log('  patterns with no primary exercise:', uncoveredPatterns.join(', '));

const uncoveredMuscles = MUSCLE_GROUPS
  .filter((g) => !EXERCISES.some((ex) => ex.primaryGroups.includes(g.key)))
  .map((g) => g.key);
if (uncoveredMuscles.length) fail(`muscle groups with no exercise: ${uncoveredMuscles.join(', ')}`);

// Balance is judged across the week, not within a day — a push day is
// supposed to be push-heavy.
console.log('\nPrograms');
for (const program of PROGRAMS) {
  const perDay = program.days.map((d) => analyseRoutine(d.exercises));
  const mins = perDay.map((a) => a.estMinutes);
  const week = analyseRoutine(program.days.flatMap((d) => d.exercises));
  console.log(`  ${program.name}: ${program.days.length} days, ~${Math.min(...mins)}–${Math.max(...mins)} min each`);
  console.log(`    patterns: ${week.patternNames.join(', ')}`);
  console.log(`    push/pull across the week: ${week.pushPull.push}/${week.pushPull.pull}${week.pushPull.balanced ? '' : '  (uneven)'}`);
  if (week.unbalanced.length) {
    console.log(`    no counterpart anywhere in the week for: ${week.unbalanced.join(', ')}`);
  }
}

if (failures) {
  console.error(`\n${failures} problem${failures === 1 ? '' : 's'} found.`);
  process.exit(1);
}
console.log('\nAll exercises valid.');
