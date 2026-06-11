/* Brain-gym game scores. These are GAME-ONLY scores — deliberately separate
   from trading XP / account progression. Persisted locally (MMKV). */
import { getItem, setItem } from "./storage";

const KEY = "jx-brain-gym";

export function getGameScores() {
  return getItem(KEY) || {};
}

/* record a finished game; keeps the best score + a play count. returns
   { best, plays, isBest } for the game just played. */
export function recordGameScore(gameId, score) {
  const all = getItem(KEY) || {};
  const prev = all[gameId] || { best: 0, plays: 0 };
  const isBest = score > prev.best;
  const next = { best: Math.max(prev.best, score), plays: (prev.plays || 0) + 1, last: score };
  all[gameId] = next;
  setItem(KEY, all);
  return { ...next, isBest };
}
