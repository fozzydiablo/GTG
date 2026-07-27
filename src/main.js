import './style.css';
import {
  EXERCISES, SPLIT, MUSCLE_GROUPS,
  getExercise, getDay, suggestedDay, exercisesForMuscle,
} from './data/exercises.js';
import { Stage, disposeAllStages } from './three/stage.js';
import {
  getSessions, getOrCreateTodaySession, getEntry, updateEntry,
  deleteEntry, exerciseHistory, epley1RM,
  getSetting, setSetting, allTimeStats, weeklyVolumes, weekStreak,
  bestE1RM, categoryVolumes, exportData, importData, isLogged,
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
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Math.round(n).toLocaleString();

// ---------- router ----------
const ROUTES = ['today', 'exercises', 'progress', 'history', 'goal'];
function getRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [route, ...rest] = h.split('/');
  return { route: ROUTES.includes(route) ? route : 'today', params: rest };
}
function go(route, ...params) {
  const target = '#/' + [route, ...params].join('/');
  if (location.hash === target) render();
  else location.hash = target;
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
  else if (route === 'exercises') renderExercises(view, params[0]);
  else if (route === 'progress') renderProgress(view);
  else if (route === 'history') renderHistory(view);
  else if (route === 'goal') renderGoal(view);
}

// ---------- rest timer ----------
const restTimer = { box: null, tick: null, endsAt: 0, duration: 90 };

function timerEl() {
  if (restTimer.box) return restTimer.box;
  const box = el('div', { class: 'rest-timer', hidden: true },
    el('div', { class: 'rt-bar' }, el('div', { class: 'rt-fill' })),
    el('div', { class: 'rt-row' },
      el('span', { class: 'rt-label' }, 'REST'),
      el('span', { class: 'rt-time' }, '1:30'),
      el('button', { class: 'rt-btn', onClick: () => adjustRest(-15) }, '−15'),
      el('button', { class: 'rt-btn', onClick: () => adjustRest(15) }, '+15'),
      el('button', { class: 'rt-btn rt-close', onClick: stopRest }, '✕'),
    ),
  );
  document.body.appendChild(box);
  restTimer.box = box;
  return box;
}

function startRest() {
  const dur = Number(getSetting('restDuration', 90));
  restTimer.duration = dur;
  restTimer.endsAt = Date.now() + dur * 1000;
  const box = timerEl();
  box.hidden = false;
  box.classList.remove('done');
  clearInterval(restTimer.tick);
  restTimer.tick = setInterval(updateRest, 250);
  updateRest();
}

function adjustRest(delta) {
  restTimer.endsAt += delta * 1000;
  restTimer.duration = Math.max(15, restTimer.duration + delta);
  setSetting('restDuration', Math.max(15, Number(getSetting('restDuration', 90)) + delta));
  updateRest();
}

function stopRest() {
  clearInterval(restTimer.tick);
  if (restTimer.box) restTimer.box.hidden = true;
}

function updateRest() {
  const box = timerEl();
  const left = Math.max(0, restTimer.endsAt - Date.now());
  const s = Math.ceil(left / 1000);
  $('.rt-time', box).textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  $('.rt-fill', box).style.width = `${100 * (1 - left / (restTimer.duration * 1000))}%`;
  if (left <= 0) {
    clearInterval(restTimer.tick);
    box.classList.add('done');
    $('.rt-time', box).textContent = 'GO!';
    navigator.vibrate?.([120, 60, 120]);
    setTimeout(() => { box.hidden = true; }, 2500);
  }
}

// ---------- transient toast ----------
function flashToast(text, cls = '') {
  const t = el('div', { class: `flash-toast ${cls}` }, text);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => {
    t.classList.remove('show');
    setTimeout(() => t.remove(), 400);
  }, 2600);
}

// ---------- TODAY ----------
function dayForToday() {
  const pick = localStorage.getItem('gtg.dayPick.' + todayISO());
  return getDay(pick) || suggestedDay();
}

function renderToday(root, focusExerciseId) {
  const day = dayForToday();
  const session = getOrCreateTodaySession(day.id);

  const focused = (focusExerciseId && getExercise(focusExerciseId))
    || getExercise(day.exercises[0]);

  const heroStageCanvas = el('canvas');
  const heroCard = el('div', { class: 'card stage' }, heroStageCanvas,
    el('div', { class: 'stage-overlay' },
      el('div', { class: 'top' },
        el('div', {},
          el('h2', { class: 'stage-title' }, focused.name),
          el('div', { class: 'stage-meta' }, focused.primary.join(' · ')),
        ),
        el('span', { class: 'pill accent' }, focused.category.toUpperCase()),
      ),
      el('div', { class: 'bottom' },
        el('span', { class: 'pill' }, focused.equipment || ''),
      ),
    ),
  );

  const cues = el('div', { class: 'exercise-cues' },
    ...focused.cues.map((c) => el('div', { class: 'cue' }, c)),
  );

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

  // Day picker — every suggested workout, today's suggestion marked.
  const suggested = suggestedDay();
  const picker = el('div', { class: 'day-picker' },
    ...SPLIT.map((d) => el('button', {
      class: 'chip' + (d.id === day.id ? ' active' : ''),
      onClick: () => {
        localStorage.setItem('gtg.dayPick.' + todayISO(), d.id);
        getOrCreateTodaySession(d.id);
        go('today');
      },
    },
      d.title.split(' — ')[0],
      d.id === suggested.id ? el('span', { class: 'chip-star', title: 'Suggested for today' }, '★') : null,
    )),
  );

  const planTitle = el('div', { class: 'row', style: 'justify-content: space-between; align-items: baseline;' },
    el('div', {},
      el('div', { class: 'section-title', style: 'margin: 0' }, day.title),
      el('div', { class: 'stage-meta' }, day.subtitle),
    ),
    el('span', { class: 'pill blue' }, new Date().toLocaleDateString(undefined, { weekday: 'long' })),
  );

  const planGrid = el('div', { class: 'day-plan' });
  for (const exId of day.exercises) {
    const ex = getExercise(exId);
    if (!ex) continue;
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

  root.appendChild(el('div', { class: 'section-title' }, 'Today\'s Workout'));
  root.appendChild(picker);
  root.appendChild(hero);
  root.appendChild(planTitle);
  root.appendChild(planGrid);

  queueMicrotask(() => new Stage(heroStageCanvas, { exercise: focused, autoRotate: true, speed: 1.0 }));
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
  const unit = exercise.defaults?.unit || 'lb';

  const head = el('div', { class: 'row', style: 'justify-content: space-between' },
    el('div', { class: 'section-title', style: 'margin: 0' }, 'Log Sets'),
    el('span', { class: 'pill' }, `${unit === 'sec' ? 'Time' : 'Reps × Weight'}`),
  );

  const grid = el('div', { class: 'set-grid' },
    el('div', { class: 'head' }, '#'),
    el('div', { class: 'head' }, unit === 'sec' ? 'Seconds' : 'Reps'),
    el('div', { class: 'head' }, unit === 'sec' ? '—' : `Weight (${unit})`),
    el('div', { class: 'head' }),
  );

  const renderSets = () => {
    grid.querySelectorAll('.set-row, .set-row > *').forEach((n) => n.remove());
    entry.sets.forEach((s, i) => {
      const repsInput = el('input', {
        class: 'input', type: 'number', min: '0', value: s.reps, inputmode: 'numeric',
        placeholder: '0',
      });
      const weightInput = el('input', {
        class: 'input', type: 'number', min: '0', step: '2.5', value: s.weight,
        inputmode: 'decimal', placeholder: unit === 'sec' ? '—' : '0',
        disabled: unit === 'sec' ? true : false,
      });
      const idx = el('div', { class: 'set-row idx', title: 'Tap to mark done' }, String(i + 1));
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
        if (s.done) {
          startRest();
          maybeCelebratePR(exercise, s, unit);
        }
      };
      idx.style.cursor = 'pointer';
      idx.addEventListener('click', toggleDone);
    });
  };

  const actions = el('div', { class: 'logger-actions' },
    el('button', {
      class: 'btn',
      onClick: () => {
        const last = entry.sets[entry.sets.length - 1]
          || { reps: exercise.defaults?.reps ?? '', weight: exercise.defaults?.weight ?? '', unit, done: false };
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
        startRest();
      },
    }, '✓ Mark All Done'),
    el('button', {
      class: 'btn ghost danger',
      onClick: () => {
        if (!confirm('Clear all sets for this exercise today?')) return;
        deleteEntry(session.id, exercise.id);
        entry.sets = getEntry(session.id, exercise.id, exercise.defaults).sets;
        renderSets();
      },
    }, 'Clear'),
  );

  // Previous performance + all-time best
  const history = exerciseHistory(exercise.id);
  const prev = history[history.length - 1];
  const best = bestE1RM(exercise.id);
  const bits = [];
  if (prev) bits.push(`Last: ${prev.topWeight}${unit === 'sec' ? 's' : ` ${unit}`} × ${prev.topReps}`);
  if (best.e1 > 0) bits.push(`Best: ${best.weight} ${unit} × ${best.reps} (≈${best.e1} 1RM)`);
  const prevText = bits.length ? bits.join('  ·  ') : 'No prior history yet — log a set to start tracking.';

  root.appendChild(head);
  root.appendChild(grid);
  renderSets();
  root.appendChild(actions);
  root.appendChild(el('div', { class: 'stage-meta' }, prevText));
}

function maybeCelebratePR(exercise, set, unit) {
  if (unit === 'sec') return;
  const w = Number(set.weight) || 0;
  const r = Number(set.reps) || 0;
  if (!w || !r) return;
  const e1 = epley1RM(w, r);
  const prevBest = bestE1RM(exercise.id, todayISO());
  if (prevBest.e1 > 0 && e1 > prevBest.e1) {
    flashToast(`🏆 New ${exercise.name} PR — ${w} ${unit} × ${r} (≈${e1} 1RM)`, 'pr');
  }
}

// ---------- EXERCISES (grouped by muscle) ----------
function renderExercises(root, filter) {
  const validKeys = MUSCLE_GROUPS.map((g) => g.key);
  const active = validKeys.includes(filter) ? filter : 'all';

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
      el('div', { class: 'equip' }, ex.equipment || ''),
    );
    queueMicrotask(() => observer.observe(canvas));
    return tile;
  };

  const bar = el('div', { class: 'filter-bar' },
    el('button', {
      class: 'chip' + (active === 'all' ? ' active' : ''),
      onClick: () => go('exercises', 'all'),
    }, 'All', el('span', { class: 'chip-count' }, String(EXERCISES.length))),
    ...MUSCLE_GROUPS.map((g) => {
      const count = exercisesForMuscle(g.key).length;
      return el('button', {
        class: 'chip' + (active === g.key ? ' active' : ''),
        onClick: () => go('exercises', g.key),
      }, g.name, el('span', { class: 'chip-count' }, String(count)));
    }),
  );

  root.appendChild(el('div', { class: 'section-title' }, 'Exercise Library'));
  root.appendChild(bar);

  const groupsToShow = active === 'all'
    ? MUSCLE_GROUPS
    : MUSCLE_GROUPS.filter((g) => g.key === active);

  for (const group of groupsToShow) {
    const list = exercisesForMuscle(group.key);
    if (!list.length) continue;
    const section = el('section', { class: 'muscle-section' });
    section.appendChild(el('div', { class: 'muscle-header' },
      el('h3', { class: 'muscle-name' }, group.name),
      el('span', { class: 'muscle-count' },
        `${list.length} ${list.length === 1 ? 'exercise' : 'exercises'}`),
    ));
    const grid = el('div', { class: 'exercise-grid' });
    for (const ex of list) grid.appendChild(makeTile(ex));
    section.appendChild(grid);
    root.appendChild(section);
  }
}

// ---------- PROGRESS ----------
function renderProgress(root) {
  const stats = allTimeStats();
  const weeks = weeklyVolumes(8);
  const thisWeek = weeks[weeks.length - 1];
  const streak = weekStreak();

  root.appendChild(el('div', { class: 'section-title' }, 'Training Dashboard'));

  root.appendChild(el('div', { class: 'stat-cards' },
    statCard(String(stats.workouts), 'Workouts logged'),
    statCard(`${streak}w`, 'Week streak'),
    statCard(fmt(thisWeek.volume), 'Volume this week (lb)'),
    statCard(fmt(stats.totalVolume), 'All-time volume (lb)'),
  ));

  // Weekly volume chart
  root.appendChild(el('div', { class: 'section-title' }, 'Weekly Volume — last 8 weeks'));
  root.appendChild(weeklyChart(weeks));

  // Per-exercise trend
  root.appendChild(el('div', { class: 'section-title' }, 'Exercise Progress'));
  const withHistory = EXERCISES.filter((ex) => exerciseHistory(ex.id).length >= 1);
  const trendCard = el('div', { class: 'card' });
  if (!withHistory.length) {
    trendCard.appendChild(el('div', { class: 'empty-state' },
      'Log a few sessions and your strength trends will appear here.'));
  } else {
    const initial = withHistory.find((e) => e.id === 'bench-press') || withHistory[0];
    const select = el('select', { class: 'input select' },
      ...withHistory.map((ex) => el('option', { value: ex.id, selected: ex.id === initial.id }, ex.name)),
    );
    const chartHolder = el('div');
    const bestLine = el('div', { class: 'stage-meta', style: 'margin-top: 8px' });
    const draw = (exId) => {
      const ex = getExercise(exId);
      const points = exerciseHistory(exId);
      chartHolder.innerHTML = '';
      if (points.length >= 2) {
        chartHolder.appendChild(lineChart(points.map((p) => ({
          label: p.date.slice(5),
          value: epley1RM(p.topWeight, p.topReps),
        }))));
      } else {
        chartHolder.appendChild(el('div', { class: 'stage-meta', style: 'padding: 12px 0' },
          'Two or more sessions needed for a trend line.'));
      }
      const best = bestE1RM(exId);
      bestLine.textContent = best.e1
        ? `${ex.name} best: ${best.weight} lb × ${best.reps} → est. 1RM ${best.e1} lb (${best.date})`
        : 'No completed sets yet.';
    };
    select.addEventListener('change', () => draw(select.value));
    trendCard.appendChild(el('div', { class: 'row', style: 'margin-bottom: 10px' }, select));
    trendCard.appendChild(chartHolder);
    trendCard.appendChild(bestLine);
    draw(initial.id);
  }
  root.appendChild(trendCard);

  // Push / pull / legs / core balance
  root.appendChild(el('div', { class: 'section-title' }, 'Training Balance — last 30 days'));
  const cats = categoryVolumes((id) => getExercise(id)?.category, 30);
  const total = Object.values(cats).reduce((a, b) => a + b, 0);
  const balance = el('div', { class: 'card balance' });
  if (!total) {
    balance.appendChild(el('div', { class: 'empty-state' }, 'No volume logged in the last 30 days.'));
  } else {
    for (const key of ['push', 'pull', 'legs', 'core']) {
      const v = cats[key] || 0;
      const pct = Math.round((v / total) * 100);
      balance.appendChild(el('div', { class: 'bal-row' },
        el('span', { class: 'bal-name' }, key.toUpperCase()),
        el('div', { class: 'bal-track' },
          el('div', { class: `bal-fill ${key}`, style: `width: ${pct}%` })),
        el('span', { class: 'bal-pct' }, `${pct}%`),
      ));
    }
  }
  root.appendChild(balance);

  // Data controls
  root.appendChild(el('div', { class: 'section-title' }, 'Your Data'));
  const fileInput = el('input', {
    type: 'file', accept: 'application/json', style: 'display:none',
    onChange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const n = importData(await f.text());
        flashToast(`Imported ${n} sessions ✓`);
        render();
      } catch (err) {
        flashToast(`Import failed: ${err.message}`, 'error');
      }
    },
  });
  root.appendChild(el('div', { class: 'card row' },
    el('button', {
      class: 'btn',
      onClick: () => {
        const blob = new Blob([exportData()], { type: 'application/json' });
        const a = el('a', {
          href: URL.createObjectURL(blob),
          download: `gtg-export-${todayISO()}.json`,
        });
        a.click();
        URL.revokeObjectURL(a.href);
      },
    }, '⬇ Export JSON'),
    el('button', { class: 'btn', onClick: () => fileInput.click() }, '⬆ Import JSON'),
    fileInput,
    el('span', { class: 'stage-meta' }, 'All data lives in this browser — export for backup or transfer.'),
  ));
}

function statCard(big, label) {
  return el('div', { class: 'stat-card' },
    el('div', { class: 'big' }, big),
    el('div', { class: 'label' }, label),
  );
}

function weeklyChart(weeks) {
  const W = 800, H = 200, P = 28;
  const max = Math.max(...weeks.map((w) => w.volume), 1);
  const bw = (W - 2 * P) / weeks.length;
  const bars = weeks.map((w, i) => {
    const h = Math.max(2, (w.volume / max) * (H - 2 * P - 16));
    const x = P + i * bw + bw * 0.14;
    const y = H - P - h;
    const label = new Date(w.weekISO + 'T00:00:00')
      .toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
    return `
      <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${h.toFixed(1)}"
            rx="4" fill="${i === weeks.length - 1 ? '#7cf2c8' : '#2e3648'}"/>
      <text x="${(x + bw * 0.36).toFixed(1)}" y="${H - P + 14}" fill="#5f6779" font-size="10" text-anchor="middle">${label}</text>
      ${w.volume ? `<text x="${(x + bw * 0.36).toFixed(1)}" y="${(y - 5).toFixed(1)}" fill="#8b94a7" font-size="10" text-anchor="middle">${Math.round(w.volume / 1000)}k</text>` : ''}
    `;
  }).join('');
  const card = el('div', { class: 'chart' });
  card.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}</svg>`;
  return card;
}

function lineChart(points, goal = null) {
  const W = 800, H = 220, P = 30;
  const ys = points.map((p) => p.value);
  const yMin = Math.min(...ys, goal ?? Infinity) * 0.9;
  const yMax = Math.max(...ys, goal ?? -Infinity) * 1.06;
  const sx = (i) => P + (i / Math.max(1, points.length - 1)) * (W - 2 * P);
  const sy = (v) => H - P - ((v - yMin) / (yMax - yMin || 1)) * (H - 2 * P);
  const path = ys.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ');

  const goalLine = goal ? `
    <line x1="${P}" y1="${sy(goal)}" x2="${W - P}" y2="${sy(goal)}" stroke="#62a8ff" stroke-dasharray="4 4" stroke-width="1"/>
    <text x="${W - P}" y="${sy(goal) - 6}" fill="#62a8ff" font-size="11" text-anchor="end">Goal ${goal}</text>` : '';

  const card = el('div', { class: 'chart' });
  card.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#7cf2c8" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#7cf2c8" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${goalLine}
      <path d="${path} L ${sx(ys.length - 1)} ${H - P} L ${sx(0)} ${H - P} Z" fill="url(#g)"/>
      <path d="${path}" fill="none" stroke="#7cf2c8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${ys.map((v, i) => `<circle cx="${sx(i)}" cy="${sy(v)}" r="3" fill="#7cf2c8"/>`).join('')}
      ${points.map((p, i) => `<text x="${sx(i)}" y="${H - 8}" fill="#5f6779" font-size="9" text-anchor="middle">${p.label}</text>`).join('')}
    </svg>
  `;
  return card;
}

// ---------- HISTORY ----------
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
    const dayMeta = getDay(s.dayId);
    const totalSets = s.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
    const totalVolume = s.entries.reduce((n, e) =>
      n + e.sets.filter((x) => x.done).reduce((m, x) => m + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0);
    day.appendChild(el('div', { class: 'day-head' },
      el('div', {},
        el('div', { class: 'date' }, date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })),
        dayMeta ? el('div', { class: 'stage-meta' }, dayMeta.title) : null,
      ),
      el('div', { class: 'summary' }, `${s.entries.length} exercises · ${totalSets} sets · ${fmt(totalVolume)} lb volume`),
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
        el('div', { class: 'ex-volume' }, vol ? `${fmt(vol)} lb` : `${completed.length} sets`),
        el('div', { class: 'sets' },
          ...e.sets.map((set) => el('span', { class: 'set' + (set.done ? ' done' : '') },
            el('strong', {}, set.reps || '—'),
            ' × ',
            el('strong', {}, set.weight || '0'),
            ` ${set.unit || 'lb'}`,
          )),
        ),
      );
      day.appendChild(row);
    }
    list.appendChild(day);
  }
  root.appendChild(list);
}

// ---------- GOAL ----------
function renderGoal(root) {
  const target = Number(getSetting('benchTarget', 135));
  const benchHistory = exerciseHistory('bench-press');
  const best = bestE1RM('bench-press');
  const pct = Math.min(100, Math.round((best.e1 / target) * 100));

  const targetInput = el('input', {
    class: 'input', type: 'number', step: '5', min: '45', value: target,
    style: 'width: 90px; text-align: center',
    onChange: (e) => {
      const v = Number(e.target.value) || 135;
      setSetting('benchTarget', v);
      render();
    },
  });

  const meter = el('div', { class: 'bench-meter' },
    el('div', { class: 'label' }, 'Estimated Bench 1RM'),
    el('div', { class: 'big' }, String(best.e1 || 0), el('small', {}, ' lb')),
    el('div', { class: 'progress' }, el('div', { class: 'bar', style: `width: ${pct}%` })),
    el('div', { class: 'target row', style: 'gap: 8px; align-items: center' },
      `${pct}% of goal · Target:`, targetInput, 'lb'),
    best.weight
      ? el('div', { class: 'stage-meta' }, `Best top set: ${best.weight} lb × ${best.reps} reps (${best.date})`)
      : el('div', { class: 'stage-meta' }, 'Log a Bench Press set to start tracking your 1RM.'),
  );

  const tips = el('div', { class: 'card' },
    el('div', { class: 'section-title' }, `Path to ${target}`),
    el('div', { class: 'col' },
      el('div', { class: 'cue' }, 'Bench 2× per week: Push A heavy (4×5 progressive overload), Push B volume (3×8–10).'),
      el('div', { class: 'cue' }, 'Add 2.5–5 lb to your top set each week as long as bar speed holds.'),
      el('div', { class: 'cue' }, 'Triceps cap your lockout — dips, pushdowns and overhead extensions are on the split for a reason.'),
      el('div', { class: 'cue' }, 'Match pressing volume with rows & pull-ups to keep the shoulders healthy.'),
      el('div', { class: 'cue' }, 'Squat and deadlift days drive whole-body strength — don\'t skip leg day.'),
      el('div', { class: 'cue' }, 'Sleep ≥7h and eat at a slight surplus on training days. Strength = recovery + reps.'),
    ),
  );

  const goalHero = el('div', { class: 'goal-hero' }, meter, tips);
  root.appendChild(el('div', { class: 'section-title' }, `Bench Press ${target} Goal`));
  root.appendChild(goalHero);

  if (benchHistory.length >= 2) {
    root.appendChild(el('div', { class: 'section-title' }, 'Top Set Over Time'));
    root.appendChild(lineChart(
      benchHistory.map((p) => ({ label: p.date.slice(5), value: epley1RM(p.topWeight, p.topReps) })),
      target,
    ));
  }
}
