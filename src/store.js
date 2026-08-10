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

// --- settings (active program, etc.) ---------------------------------------

const SETTINGS_KEY = 'gtg.settings.v1';

export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

export function setSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
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
