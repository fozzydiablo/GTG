import './style.css';
import {
  EXERCISES, getExercise, FACETS, getFacet,
} from './data/exercises/index.js';
import {
  PROGRAMS, getProgram, suggestedDay, analyseRoutine, DEFAULT_PROGRAM_ID,
} from './data/routines.js';
import {
  muscleNames, patternName, equipmentName, loadingName, levelName,
  categoryName, planeName, DEMAND_KEYS,
} from './data/taxonomy.js';
import { Stage, disposeAllStages } from './three/stage.js';
import {
  getSessions, getOrCreateTodaySession, getEntry, updateEntry,
  deleteEntry, exerciseHistory, epley1RM, getSettings, setSetting,
} from './store.js';
import { initPWA } from './pwa.js';

// ---------- tiny helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') node.innerHTML = v;
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    // Numbers arrive from stored set data, which is not always stringified.
    const isText = typeof c === 'string' || typeof c === 'number';
    node.appendChild(isText ? document.createTextNode(String(c)) : c);
  }
  return node;
};

// ---------- router ----------
const ROUTES = ['today', 'exercises', 'history', 'goal'];
function getRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [route, ...rest] = h.split('/');
  return { route: ROUTES.includes(route) ? route : 'today', params: rest };
}
function go(route, ...params) {
  location.hash = '#/' + [route, ...params].join('/');
}

window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', () => {
  $$('.tab').forEach((t) => t.addEventListener('click', () => go(t.dataset.route)));
  render();
  initPWA();
});

function render() {
  disposeAllStages();
  const { route, params } = getRoute();
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.route === route));
  const view = $('#view');
  view.innerHTML = '';
  if (route === 'today') renderToday(view, params[0]);
  else if (route === 'exercises') renderExercises(view, params[0], params[1]);
  else if (route === 'history') renderHistory(view);
  else if (route === 'goal') renderGoal(view);
}

// ---------- TODAY ----------
function renderToday(root, focusExerciseId) {
  const program = getProgram(getSettings().programId || DEFAULT_PROGRAM_ID);
  const day = suggestedDay(program);
  const session = getOrCreateTodaySession(day.id);

  // Hero exercise
  const focused = focusExerciseId
    ? getExercise(focusExerciseId)
    : getExercise(day.exercises[0]);

  const heroStageCanvas = el('canvas');
  const heroCard = el('div', { class: 'card stage' }, heroStageCanvas,
    el('div', { class: 'stage-overlay' },
      el('div', { class: 'top' },
        el('div', {},
          el('h2', { class: 'stage-title' }, focused.name),
          el('div', { class: 'stage-meta' }, focused.primary.join(' · ')),
        ),
        el('span', { class: 'pill accent' }, categoryName(focused.category).toUpperCase()),
      ),
      el('div', { class: 'stage-tags' },
        // Pattern · loading · kit, de-duplicated (a carry is both a "carry"
        // pattern and "carry" loading — one chip is enough).
        ...[...new Set([
          patternName(focused.pattern),
          loadingName(focused.loading),
          ...focused.equipment.map(equipmentName),
        ])].map((label) => el('span', { class: 'tag' }, label)),
      ),
    ),
  );

  // Exercise info + cues
  const cues = el('div', { class: 'exercise-cues' },
    ...focused.cues.map((c) => el('div', { class: 'cue' }, c)),
  );

  // Logger
  const loggerCard = el('div', { class: 'card logger' });
  buildLogger(loggerCard, session, focused);

  const info = el('div', { class: 'info' },
    el('div', { class: 'card' },
      el('div', { class: 'section-title' }, 'Form Cues'),
      cues,
    ),
    loggerCard,
  );

  const hero = el('div', { class: 'hero' }, heroCard, info);

  // Program picker
  const programRow = el('div', { class: 'program-bar' },
    el('div', { class: 'label' }, 'Program'),
    el('select', {
      class: 'select',
      onChange: (e) => { setSetting('programId', e.target.value); go('today'); render(); },
    },
      ...PROGRAMS.map((p) => el('option', {
        value: p.id,
        selected: p.id === program.id ? 'selected' : false,
      }, `${p.name} · ${p.daysPerWeek}d`)),
    ),
    el('div', { class: 'stage-meta' }, program.subtitle),
  );

  // Day plan
  const analysis = analyseRoutine(day.exercises);
  const planTitle = el('div', { class: 'row', style: 'justify-content: space-between; align-items: baseline;' },
    el('div', {},
      el('div', { class: 'section-title', style: 'margin: 0' }, day.title),
      el('div', { class: 'stage-meta' },
        `${day.subtitle} — ${analysis.patternNames.join(' · ')} · ~${analysis.estMinutes} min`),
    ),
    el('span', { class: 'pill blue' }, new Date().toLocaleDateString(undefined, { weekday: 'long' })),
  );

  const planGrid = el('div', { class: 'day-plan' });
  for (const exId of day.exercises) {
    const ex = getExercise(exId);
    const miniCanvas = el('canvas');
    const card = el('div', {
      class: 'plan-card' + (ex.id === focused.id ? ' active' : ''),
      onClick: () => go('today', ex.id),
    },
      el('div', { class: 'mini-stage' }, miniCanvas),
      el('div', { class: 'title' }, ex.name),
      el('div', { class: 'meta' }, ex.primary.slice(0, 2).join(' · ')),
      lastSetText(session, ex),
    );
    planGrid.appendChild(card);
    queueMicrotask(() => new Stage(miniCanvas, { exercise: ex, autoRotate: false, speed: 0.9 }));
  }

  root.appendChild(hero);
  root.appendChild(exerciseDetail(focused));
  root.appendChild(programRow);
  root.appendChild(planTitle);
  root.appendChild(planGrid);

  // Kick off the hero stage after layout. ?phase=0.42 freezes the rep at a
  // fixed point — used by scripts/screenshots.mjs to capture poster frames.
  const frozen = new URLSearchParams(location.search).get('phase');
  queueMicrotask(() => new Stage(heroStageCanvas, {
    exercise: focused,
    autoRotate: frozen == null,
    speed: 1.0,
    phase: frozen == null ? null : Number(frozen),
  }));
}

// Full classification read-out for one exercise: what it trains, how it's
// classified, what it costs, and what to do before/after it.
function exerciseDetail(ex) {
  const chip = (label, value) => el('div', { class: 'spec' },
    el('div', { class: 'k' }, label),
    el('div', { class: 'v' }, value),
  );

  const muscleRow = (label, ids, cls) => (ids.length
    ? el('div', { class: 'muscle-row' },
      el('div', { class: 'k' }, label),
      el('div', { class: 'chips' }, ...muscleNames(ids).map((n) => el('span', { class: `tag ${cls}` }, n))),
    )
    : null);

  const demandBar = (d) => el('div', { class: 'demand' },
    el('div', { class: 'k' }, d.name),
    el('div', { class: 'meter', title: `${d.name}: ${ex.demands[d.id]}/5 — ${d.desc}` },
      ...Array.from({ length: 5 }, (_, i) =>
        el('span', { class: 'notch' + (i < ex.demands[d.id] ? ' on' : '') })),
    ),
  );

  const related = (label, ids) => {
    const list = ids.map(getExercise).filter(Boolean);
    if (!list.length) return null;
    return el('div', { class: 'muscle-row' },
      el('div', { class: 'k' }, label),
      el('div', { class: 'chips' },
        ...list.map((r) => el('button', {
          class: 'tag link', onClick: () => go('today', r.id),
        }, r.name)),
      ),
    );
  };

  const p = ex.programming;
  const repText = ex.metric.type === 'time'
    ? `${p.sets} × ${p.reps}s`
    : ex.metric.type === 'distance'
      ? `${p.sets} × ${p.reps}m`
      : `${p.sets} × ${p.repRange ? `${p.repRange[0]}–${p.repRange[1]}` : p.reps}`;

  return el('div', { class: 'card detail' },
    el('div', { class: 'section-title' }, 'Classification'),
    el('div', { class: 'spec-grid' },
      chip('Pattern', patternName(ex.pattern)),
      chip('Category', categoryName(ex.category)),
      chip('Force', ex.force),
      chip('Mechanics', ex.mechanics),
      chip('Chain', ex.chain),
      chip('Laterality', ex.laterality + (ex.metric.perSide ? ' (per side)' : '')),
      chip('Loading', loadingName(ex.loading)),
      chip('Planes', ex.planes.map(planeName).join(', ')),
      chip('Level', levelName(ex.level)),
      chip('Equipment', ex.equipment.map(equipmentName).join(' + ')),
      chip('Prescription', `${repText} · ${p.restSec}s rest${p.rpe ? ` · RPE ${p.rpe}` : ''}`),
      chip('Trains for', ex.goals.join(', ')),
    ),

    el('div', { class: 'section-title' }, 'Muscles'),
    el('div', { class: 'col' },
      muscleRow('Prime movers', ex.muscles.primary, 'accent'),
      muscleRow('Assisting', ex.muscles.secondary, ''),
      muscleRow('Stabilising', ex.muscles.stabilizers, 'dim'),
      ex.jointActions.length
        ? el('div', { class: 'muscle-row' },
          el('div', { class: 'k' }, 'Joint actions'),
          el('div', { class: 'chips' },
            ...ex.jointActions.map((ja) => el('span', { class: 'tag dim' }, `${ja.joint} ${ja.action}`))),
        )
        : null,
    ),

    el('div', { class: 'section-title' }, 'Demands'),
    el('div', { class: 'demand-grid' }, ...DEMAND_KEYS.map(demandBar)),

    ex.mistakes.length
      ? el('div', {},
        el('div', { class: 'section-title' }, 'Common Mistakes'),
        el('div', { class: 'exercise-cues warn' },
          ...ex.mistakes.map((m) => el('div', { class: 'cue' }, m))),
      )
      : null,

    ex.breathing ? el('div', { class: 'note' }, `Breathing — ${ex.breathing}`) : null,
    ex.contraindications?.length
      ? el('div', { class: 'note danger' }, `Skip or modify if: ${ex.contraindications.join(', ')}.`)
      : null,

    el('div', { class: 'section-title' }, 'Related'),
    el('div', { class: 'col' },
      related('Easier', ex.progression.regressions),
      related('Harder', ex.progression.progressions),
      related('Swap for', ex.progression.variations),
      related('Pairs with', ex.progression.pairsWith),
    ),
  );
}

function lastSetText(session, ex) {
  const entry = session.entries.find((e) => e.exerciseId === ex.id);
  if (!entry) return el('div', { class: 'last' }, 'Not logged yet');
  const done = entry.sets.filter((s) => s.done).length;
  return el('div', { class: 'last' }, `${done}/${entry.sets.length} sets logged`);
}

function buildLogger(root, session, exercise) {
  root.innerHTML = '';
  const entry = getEntry(session.id, exercise.id, exercise.defaults);
  const metric = exercise.metric;
  const unit = exercise.defaults?.unit || metric.unit || 'lb';
  // What the first column counts, and whether a load column makes sense.
  const countLabel = { reps: 'Reps', time: 'Seconds', distance: 'Metres' }[metric.type] || 'Reps';
  const loaded = metric.load !== 'bodyweight';
  const weightUnit = metric.type === 'reps' ? unit : 'lb';

  const head = el('div', { class: 'row', style: 'justify-content: space-between' },
    el('div', { class: 'section-title', style: 'margin: 0' }, 'Log Sets'),
    el('span', { class: 'pill' },
      `${countLabel}${loaded ? ` × Weight` : ''}${metric.perSide ? ' · per side' : ''}`),
  );

  const grid = el('div', { class: 'set-grid' },
    el('div', { class: 'head' }, '#'),
    el('div', { class: 'head' }, countLabel),
    el('div', { class: 'head' }, loaded ? `Weight (${weightUnit})` : '—'),
    el('div', { class: 'head' }),
  );

  const renderSets = () => {
    // Remove old set rows
    grid.querySelectorAll('.set-row, .set-row > *').forEach((n) => n.remove());
    entry.sets.forEach((s, i) => {
      const repsInput = el('input', {
        class: 'input', type: 'number', min: '0', value: s.reps, inputmode: 'numeric',
        placeholder: '0',
      });
      const weightInput = el('input', {
        class: 'input', type: 'number', min: '0', step: '2.5', value: s.weight,
        inputmode: 'decimal', placeholder: loaded ? '0' : '—',
        disabled: loaded ? false : true,
      });
      const idx = el('div', { class: 'set-row idx' }, String(i + 1));
      const del = el('button', {
        class: 'set-row delete', title: 'Remove set',
        onClick: () => {
          updateEntry(session.id, exercise.id, (e) => { e.sets.splice(i, 1); });
          entry.sets.splice(i, 1);
          renderSets();
        },
      }, '×');

      [idx, repsInput, weightInput, del].forEach((n) => {
        n.classList.add('set-row');
        if (s.done) n.classList.add('done');
        grid.appendChild(n);
      });

      const persist = () => {
        updateEntry(session.id, exercise.id, (e) => {
          e.sets[i] = { ...e.sets[i], reps: repsInput.value, weight: weightInput.value, unit };
        });
      };
      repsInput.addEventListener('input', persist);
      weightInput.addEventListener('input', persist);

      const toggleDone = () => {
        s.done = !s.done;
        updateEntry(session.id, exercise.id, (e) => { e.sets[i].done = s.done; });
        [idx, repsInput, weightInput, del].forEach((n) => n.classList.toggle('done', s.done));
      };
      // Click on the set number to mark done
      idx.style.cursor = 'pointer';
      idx.addEventListener('click', toggleDone);
    });
  };

  const actions = el('div', { class: 'logger-actions' },
    el('button', {
      class: 'btn',
      onClick: () => {
        const last = entry.sets[entry.sets.length - 1] || { reps: exercise.defaults?.reps ?? '', weight: exercise.defaults?.weight ?? '', unit, done: false };
        const ns = { ...last, done: false };
        entry.sets.push(ns);
        updateEntry(session.id, exercise.id, (e) => e.sets.push(ns));
        renderSets();
      },
    }, '+ Add Set'),
    el('button', {
      class: 'btn primary',
      onClick: () => {
        entry.sets.forEach((s, i) => {
          s.done = true;
          updateEntry(session.id, exercise.id, (e) => { e.sets[i].done = true; });
        });
        renderSets();
      },
    }, '✓ Mark All Done'),
    el('button', {
      class: 'btn ghost danger',
      onClick: () => {
        if (!confirm('Clear all sets for this exercise today?')) return;
        deleteEntry(session.id, exercise.id);
        // Re-init fresh
        entry.sets = getEntry(session.id, exercise.id, exercise.defaults).sets;
        renderSets();
      },
    }, 'Clear'),
  );

  // Best previous performance
  const history = exerciseHistory(exercise.id);
  const prev = history[history.length - 1];
  const prevText = prev
    ? `Last time: ${loaded ? `${prev.topWeight} ${weightUnit} × ` : ''}${prev.topReps} ${countLabel.toLowerCase()}`
    : 'No prior history yet — log a set to start tracking.';

  root.appendChild(head);
  root.appendChild(grid);
  renderSets();
  root.appendChild(actions);
  root.appendChild(el('div', { class: 'stage-meta' }, prevText));
}

// ---------- EXERCISES (grouped by any classification facet) ----------
// Route: #/exercises/<facet>/<bucket>, e.g. #/exercises/pattern/hinge.
// A bare #/exercises/<muscleGroup> still works — that was the old URL shape.
function renderExercises(root, facetKey, bucketKey) {
  let facet = getFacet(facetKey);
  let active = bucketKey || 'all';
  if (!facet) {
    facet = getFacet('muscle');
    active = facetKey && facet.buckets().some((b) => b.key === facetKey) ? facetKey : 'all';
  }
  if (active !== 'all' && !facet.buckets().some((b) => b.key === active)) active = 'all';

  // Per-render observer: only mounts a Stage when its tile scrolls near
  // the viewport, so opening "All" doesn't spin up 25 WebGL contexts at once.
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const canvas = entry.target;
      if (canvas.dataset.mounted) continue;
      canvas.dataset.mounted = '1';
      new Stage(canvas, { exercise: getExercise(canvas.dataset.exerciseId), autoRotate: false, speed: 1.0 });
      observer.unobserve(canvas);
    }
  }, { rootMargin: '160px 0px' });

  const makeTile = (ex) => {
    const canvas = el('canvas');
    canvas.dataset.exerciseId = ex.id;
    const tile = el('div', {
      class: 'exercise-tile',
      onClick: () => go('today', ex.id),
    },
      el('div', { class: 'stage-mini' }, canvas),
      el('div', { class: 'name' }, ex.name),
      el('div', { class: 'muscles' }, ex.primary.join(' · ')),
      el('div', { class: 'tile-tags' },
        el('span', { class: 'tag' }, patternName(ex.pattern)),
        el('span', { class: 'tag dim' }, equipmentName(ex.equipment[0])),
      ),
    );
    queueMicrotask(() => observer.observe(canvas));
    return tile;
  };

  const buckets = facet.buckets();

  // Which axis are we slicing the library on?
  const facetBar = el('div', { class: 'facet-bar' },
    el('span', { class: 'label' }, 'Group by'),
    ...FACETS.map((f) => el('button', {
      class: 'chip' + (f.key === facet.key ? ' active' : ''),
      onClick: () => go('exercises', f.key, 'all'),
    }, f.name)),
  );

  const bar = el('div', { class: 'filter-bar' },
    el('button', {
      class: 'chip' + (active === 'all' ? ' active' : ''),
      onClick: () => go('exercises', facet.key, 'all'),
    }, 'All', el('span', { class: 'chip-count' }, String(EXERCISES.length))),
    ...buckets.map((b) => {
      const count = facet.match(b.key).length;
      return el('button', {
        class: 'chip' + (active === b.key ? ' active' : ''),
        onClick: () => go('exercises', facet.key, b.key),
      }, b.name, el('span', { class: 'chip-count' }, String(count)));
    }),
  );

  root.appendChild(el('div', { class: 'section-title' }, 'Exercise Library'));
  root.appendChild(facetBar);
  root.appendChild(bar);

  const shown = active === 'all' ? buckets : buckets.filter((b) => b.key === active);

  for (const bucket of shown) {
    const list = facet.match(bucket.key);
    if (!list.length) continue;
    const section = el('section', { class: 'muscle-section' });
    section.appendChild(el('div', { class: 'muscle-header' },
      el('h3', { class: 'muscle-name' }, bucket.name),
      el('span', { class: 'muscle-count' },
        `${list.length} ${list.length === 1 ? 'exercise' : 'exercises'}`),
    ));
    const grid = el('div', { class: 'exercise-grid' });
    for (const ex of list) grid.appendChild(makeTile(ex));
    section.appendChild(grid);
    root.appendChild(section);
  }
}

// ---------- HISTORY ----------
// One logged set, read through the exercise's metric so a 40 m carry doesn't
// render as "40 × 44 m" and a 60-second plank doesn't grow a weight column.
function setChip(ex, set) {
  const count = set.reps || '—';
  const weight = Number(set.weight) || 0;
  const type = ex.metric?.type || 'reps';
  if (type === 'time') return el('span', { class: 'set' }, el('strong', {}, count), ' s');
  if (type === 'distance') {
    return el('span', { class: 'set' },
      el('strong', {}, count), ' m', weight ? ` · ${weight} lb` : '');
  }
  return el('span', { class: 'set' },
    el('strong', {}, count), ' × ', el('strong', {}, String(weight)), ' lb');
}

function renderHistory(root) {
  const sessions = getSessions();
  root.appendChild(el('div', { class: 'section-title' }, 'Workout History'));
  if (!sessions.length) {
    root.appendChild(el('div', { class: 'card empty-state' }, 'No workouts logged yet. Head to Today to start your first session.'));
    return;
  }
  const list = el('div', { class: 'history-list' });
  for (const s of sessions) {
    const date = new Date(s.dateISO + 'T00:00:00');
    const day = el('div', { class: 'history-day' });
    const totalSets = s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
    const totalVolume = s.entries.reduce((n, e) =>
      n + e.sets.filter((x) => x.done).reduce((m, x) => m + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0);
    day.appendChild(el('div', { class: 'day-head' },
      el('div', { class: 'date' }, date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })),
      el('div', { class: 'summary' }, `${s.entries.length} exercises · ${totalSets} sets · ${Math.round(totalVolume).toLocaleString()} lb volume`),
    ));
    if (!s.entries.length) {
      day.appendChild(el('div', { class: 'stage-meta' }, 'No exercises logged.'));
    }
    for (const e of s.entries) {
      const ex = getExercise(e.exerciseId);
      if (!ex) continue;
      const completed = e.sets.filter((x) => x.done);
      const vol = completed.reduce((m, x) => m + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0);
      const row = el('div', { class: 'history-ex' },
        el('div', { class: 'ex-name' }, ex.name),
        el('div', { class: 'ex-volume' }, vol ? `${Math.round(vol).toLocaleString()} lb` : `${completed.length} sets`),
        el('div', { class: 'sets' },
          ...e.sets.map((set) => setChip(ex, set)),
        ),
      );
      day.appendChild(row);
    }
    list.appendChild(day);
  }
  root.appendChild(list);
}

// ---------- GOAL (Bench 135) ----------
function renderGoal(root) {
  const benchHistory = exerciseHistory('bench-press');
  const best = benchHistory.reduce((acc, p) => {
    const e1 = epley1RM(p.topWeight, p.topReps);
    return e1 > acc.e1 ? { e1, weight: p.topWeight, reps: p.topReps, date: p.date } : acc;
  }, { e1: 0, weight: 0, reps: 0, date: null });

  const target = 135;
  const pct = Math.min(100, Math.round((best.e1 / target) * 100));

  const meter = el('div', { class: 'bench-meter' },
    el('div', { class: 'label' }, 'Estimated Bench 1RM'),
    el('div', { class: 'big' }, String(best.e1 || 0), el('small', {}, ' lb')),
    el('div', { class: 'progress' }, el('div', { class: 'bar', style: `width: ${pct}%` })),
    el('div', { class: 'target' }, `${pct}% of goal — Target: ${target} lb`),
    best.weight
      ? el('div', { class: 'stage-meta' }, `Best top set: ${best.weight} lb × ${best.reps} reps`)
      : el('div', { class: 'stage-meta' }, 'Log a Bench Press set to start tracking your 1RM.'),
  );

  const tips = el('div', { class: 'card' },
    el('div', { class: 'section-title' }, 'Path to 135'),
    el('div', { class: 'col' },
      el('div', { class: 'cue' }, 'Bench 2× per week. Day 1 heavy (4×5 progressive overload), Day 4 volume (3×8–10).'),
      el('div', { class: 'cue' }, 'Add 2.5–5 lb to your top set each week as long as form holds.'),
      el('div', { class: 'cue' }, 'Hit triceps and front delts with overhead press, dips, and pushdowns — they cap your bench.'),
      el('div', { class: 'cue' }, 'Match push volume with row & pull-up volume to keep shoulders healthy.'),
      el('div', { class: 'cue' }, 'Sleep ≥7h and eat in a slight surplus on training days. Strength = recovery + reps.'),
    ),
  );

  const goalHero = el('div', { class: 'goal-hero' }, meter, tips);
  root.appendChild(el('div', { class: 'section-title' }, 'Bench Press 135 Goal'));
  root.appendChild(goalHero);

  // Chart
  if (benchHistory.length >= 2) {
    root.appendChild(el('div', { class: 'section-title' }, 'Top Set Over Time'));
    root.appendChild(renderChart(benchHistory));
  }
}

function renderChart(points) {
  const W = 800, H = 220, P = 30;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => epley1RM(p.topWeight, p.topReps));
  const yMin = Math.min(...ys, 45);
  const yMax = Math.max(...ys, 145);
  const sx = (i) => P + (i / Math.max(1, xs.length - 1)) * (W - 2 * P);
  const sy = (v) => H - P - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * P);
  const path = ys.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');
  const goalY = sy(135);

  const card = el('div', { class: 'chart' });
  card.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7cf2c8" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#7cf2c8" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <line x1="${P}" y1="${goalY}" x2="${W - P}" y2="${goalY}" stroke="#62a8ff" stroke-dasharray="4 4" stroke-width="1"/>
      <text x="${W - P}" y="${goalY - 6}" fill="#62a8ff" font-size="11" text-anchor="end">Goal 135</text>
      <path d="${path} L ${sx(ys.length - 1)} ${H - P} L ${sx(0)} ${H - P} Z" fill="url(#g)"/>
      <path d="${path}" fill="none" stroke="#7cf2c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${ys.map((v, i) => `<circle cx="${sx(i)}" cy="${sy(v)}" r="3" fill="#7cf2c8"/>`).join('')}
    </svg>
  `;
  return card;
}
