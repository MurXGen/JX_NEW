/* Achievement badges — same milestones as the web overview.
   Each badge: { id, icon (emoji), label, hint, got } computed from stats. */
export function buildAchievements(s = {}) {
  const total = s.n || 0;
  const net = s.net || 0;
  const winRate = s.winRate || 0;
  const bestWin = s.bestStreak || 0;
  const bestGreen = s.bestGreenStreak || 0;
  return [
    { id: "first", icon: "🎯", label: "First trade", hint: "Log your first trade", got: total >= 1 },
    { id: "ten", icon: "📒", label: "10 trades", hint: "Log 10 trades", got: total >= 10 },
    { id: "fifty", icon: "📚", label: "50 trades", hint: "Log 50 trades", got: total >= 50 },
    { id: "hundred", icon: "🏛️", label: "Centurion", hint: "Log 100 trades", got: total >= 100 },
    { id: "streak5", icon: "🔥", label: "5-win streak", hint: "Win 5 in a row", got: bestWin >= 5 },
    { id: "streak10", icon: "⚡", label: "10-win streak", hint: "Win 10 in a row", got: bestWin >= 10 },
    { id: "green5", icon: "🌱", label: "5 green days", hint: "5 profitable days in a row", got: bestGreen >= 5 },
    { id: "profit1k", icon: "💰", label: "$1k profit", hint: "Reach $1,000 net P&L", got: net >= 1000 },
    { id: "profit10k", icon: "💎", label: "$10k profit", hint: "Reach $10,000 net P&L", got: net >= 10000 },
    { id: "wr60", icon: "🎖️", label: "60% win rate", hint: "60%+ win rate over 20+ trades", got: total >= 20 && winRate >= 60 },
  ];
}
