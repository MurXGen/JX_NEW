/* Trader Gym progress — daily streak, XP and per-activity scores.
   Everything is stored locally (no backend) under one key. */

const KEY = "jx-trader-gym";

const todayStr = () => new Date().toDateString();

const blank = () => ({
  xp: 0,
  streak: 0,
  lastPlayed: null, // toDateString of last day any activity was completed
  bestScores: {}, // activityId -> best score
  history: {}, // "YYYY-MM-DD" -> { activityId: { xp, score, ts } }
});

export function getProgress() {
  if (typeof window === "undefined") return blank();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    return raw && typeof raw === "object" ? { ...blank(), ...raw } : blank();
  } catch {
    return blank();
  }
}

function save(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("jx-gym-changed"));
  } catch {}
}

/* Which activities were completed today */
export function completedToday() {
  const p = getProgress();
  return p.history?.[todayStr()] || {};
}

export function isDoneToday(activityId) {
  return Boolean(completedToday()[activityId]);
}

/* Record a finished activity. xp awarded, score 0..100 (or raw points).
   Streak increments the first time ANY activity is completed on a new day. */
export function recordActivity(activityId, { xp = 0, score = 0 } = {}) {
  const p = getProgress();
  const today = todayStr();

  // streak bookkeeping — only on the first completion of a new day
  const alreadyToday = Boolean(p.history?.[today] && Object.keys(p.history[today]).length);
  if (!alreadyToday) {
    if (p.lastPlayed) {
      const diffDays = Math.round(
        (new Date(today).getTime() - new Date(p.lastPlayed).getTime()) / 864e5,
      );
      if (diffDays === 1) p.streak = (p.streak || 0) + 1;
      else if (diffDays > 1) p.streak = 1; // missed a day → reset
      // diffDays === 0 shouldn't happen here
    } else {
      p.streak = 1;
    }
    p.lastPlayed = today;
  }

  p.xp = (p.xp || 0) + xp;
  p.bestScores = p.bestScores || {};
  p.bestScores[activityId] = Math.max(p.bestScores[activityId] || 0, score);

  p.history = p.history || {};
  p.history[today] = p.history[today] || {};
  p.history[today][activityId] = { xp, score, ts: Date.now() };

  save(p);
  return p;
}

/* XP → level (simple curve) */
export function levelFor(xp) {
  const level = Math.floor(Math.sqrt((xp || 0) / 50)) + 1;
  const floor = (level - 1) * (level - 1) * 50;
  const next = level * level * 50;
  return { level, floor, next, pct: Math.min(100, Math.round(((xp - floor) / (next - floor)) * 100)) };
}
