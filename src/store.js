// LocalStorage-backed workout history.
// Schema: { sessions: [{ id, dateISO, dayId, entries: [{ exerciseId, sets: [{ reps, weight, unit, done }] }] }] }

const KEY = 'gtg.history.v1';

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { sessions: [] };
    return JSON.parse(raw);
  } catch {
    return { sessions: [] };
  }
}

function write(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function getSessions() {
  return read().sessions.slice().sort((a, b) => b.dateISO.localeCompare(a.dateISO));
}

export function getOrCreateTodaySession(dayId) {
  const data = read();
  const key = todayKey();
  let session = data.sessions.find((s) => s.dateISO === key);
  if (!session) {
    session = { id: crypto.randomUUID(), dateISO: key, dayId, entries: [] };
    data.sessions.push(session);
    write(data);
  } else if (dayId && session.dayId !== dayId) {
    session.dayId = dayId;
    write(data);
  }
  return session;
}

export function getEntry(sessionId, exerciseId, defaults) {
  const data = read();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  let entry = session.entries.find((e) => e.exerciseId === exerciseId);
  if (!entry) {
    const setCount = defaults?.sets ?? 3;
    entry = {
      exerciseId,
      sets: Array.from({ length: setCount }, () => ({
        reps: defaults?.reps ?? '',
        weight: defaults?.weight ?? '',
        unit: defaults?.unit ?? 'lb',
        done: false,
      })),
    };
    session.entries.push(entry);
    write(data);
  }
  return entry;
}

export function updateEntry(sessionId, exerciseId, mutator) {
  const data = read();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const entry = session.entries.find((e) => e.exerciseId === exerciseId);
  if (!entry) return;
  mutator(entry);
  write(data);
}

export function deleteSession(sessionId) {
  const data = read();
  data.sessions = data.sessions.filter((s) => s.id !== sessionId);
  write(data);
}

export function deleteEntry(sessionId, exerciseId) {
  const data = read();
  const session = data.sessions.find((s) => s.id === sessionId);
  if (!session) return;
  session.entries = session.entries.filter((e) => e.exerciseId !== exerciseId);
  write(data);
}

// Find best top set per workout date for an exercise (max weight x reps).
export function exerciseHistory(exerciseId) {
  const sessions = getSessions();
  const points = [];
  for (const s of sessions) {
    const entry = s.entries.find((e) => e.exerciseId === exerciseId);
    if (!entry) continue;
    const completed = entry.sets.filter((set) => set.done && Number(set.weight) >= 0 && Number(set.reps) > 0);
    if (!completed.length) continue;
    let topWeight = 0, topReps = 0, topVolume = 0;
    for (const set of completed) {
      const w = Number(set.weight) || 0;
      const r = Number(set.reps) || 0;
      const v = w * r;
      if (w > topWeight || (w === topWeight && r > topReps)) {
        topWeight = w;
        topReps = r;
      }
      topVolume += v;
    }
    points.push({ date: s.dateISO, topWeight, topReps, volume: topVolume });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// Estimated 1RM (Epley)
export function epley1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
}

// ---------------------------------------------------------------------------
// Settings (goal target, rest duration, …)
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'gtg.settings.v1';

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function getSetting(key, fallback) {
  const s = readSettings();
  return s[key] ?? fallback;
}

export function setSetting(key, value) {
  const s = readSettings();
  s[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

function sessionVolume(session) {
  return session.entries.reduce((n, e) =>
    n + e.sets.filter((x) => x.done)
      .reduce((m, x) => m + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0), 0);
}

function sessionDoneSets(session) {
  return session.entries.reduce((n, e) => n + e.sets.filter((x) => x.done).length, 0);
}

export function isLogged(session) {
  return sessionDoneSets(session) > 0;
}

export function allTimeStats() {
  const sessions = getSessions().filter(isLogged);
  return {
    workouts: sessions.length,
    totalVolume: sessions.reduce((n, s) => n + sessionVolume(s), 0),
    totalSets: sessions.reduce((n, s) => n + sessionDoneSets(s), 0),
  };
}

function mondayOf(dateISO) {
  const d = new Date(dateISO + 'T00:00:00');
  const day = (d.getDay() + 6) % 7; // Mon=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// Last n calendar weeks (oldest → newest): [{ weekISO, volume, sessions }]
export function weeklyVolumes(nWeeks = 8) {
  const sessions = getSessions().filter(isLogged);
  const byWeek = new Map();
  for (const s of sessions) {
    const wk = mondayOf(s.dateISO);
    const cur = byWeek.get(wk) || { volume: 0, sessions: 0 };
    cur.volume += sessionVolume(s);
    cur.sessions += 1;
    byWeek.set(wk, cur);
  }
  const out = [];
  const now = new Date();
  const thisMonday = mondayOf(now.toISOString().slice(0, 10));
  for (let i = nWeeks - 1; i >= 0; i--) {
    const d = new Date(thisMonday + 'T00:00:00');
    d.setDate(d.getDate() - i * 7);
    const wk = d.toISOString().slice(0, 10);
    const cur = byWeek.get(wk) || { volume: 0, sessions: 0 };
    out.push({ weekISO: wk, ...cur });
  }
  return out;
}

// Consecutive weeks (including this one if trained) with ≥1 logged session.
export function weekStreak() {
  const weeks = new Set(getSessions().filter(isLogged).map((s) => mondayOf(s.dateISO)));
  let streak = 0;
  const cursor = new Date(mondayOf(new Date().toISOString().slice(0, 10)) + 'T00:00:00');
  if (!weeks.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// Best-ever top set by estimated 1RM for an exercise.
export function bestE1RM(exerciseId, beforeDateISO = null) {
  const points = exerciseHistory(exerciseId)
    .filter((p) => !beforeDateISO || p.date < beforeDateISO);
  return points.reduce((acc, p) => {
    const e1 = epley1RM(p.topWeight, p.topReps);
    return e1 > acc.e1 ? { e1, weight: p.topWeight, reps: p.topReps, date: p.date } : acc;
  }, { e1: 0, weight: 0, reps: 0, date: null });
}

// Done-set volume per exercise category over the last `days` days.
// `categorize(exerciseId)` → category string.
export function categoryVolumes(categorize, days = 30) {
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const out = {};
  for (const s of getSessions()) {
    if (s.dateISO < cutoff) continue;
    for (const e of s.entries) {
      const cat = categorize(e.exerciseId);
      if (!cat) continue;
      const vol = e.sets.filter((x) => x.done)
        .reduce((m, x) => m + (Number(x.weight) || 0) * (Number(x.reps) || 0), 0);
      // Bodyweight work still counts effort: score sets when volume is zero.
      out[cat] = (out[cat] || 0) + vol;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Export / import
// ---------------------------------------------------------------------------

export function exportData() {
  return JSON.stringify({
    app: 'gtg',
    version: 1,
    exportedAt: new Date().toISOString(),
    history: read(),
    settings: readSettings(),
  }, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (data?.app !== 'gtg' || !data.history?.sessions) {
    throw new Error('Not a GTG export file.');
  }
  write(data.history);
  if (data.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(data.settings));
  return data.history.sessions.length;
}
