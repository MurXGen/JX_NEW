/* Plan limits + usage (mirrors the web's free vs pro rules). */
export function getPlanLimits(subscription) {
  const pro = subscription?.status === "active" && (subscription.plan === "pro" || subscription.plan === "lifetime");
  if (pro) return { tradesPerMonth: Infinity, journals: Infinity, imagesPerTrade: 4, chartLogs: Infinity, label: subscription.plan === "lifetime" ? "Lifetime" : "Pro" };
  return { tradesPerMonth: 30, journals: 1, imagesPerTrade: 1, chartLogs: 5, label: "Free" };
}

export function tradesThisMonth(trades = []) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  return trades.filter((t) => {
    const d = new Date(t.closeTime || t.openTime || t.createdAt);
    return !Number.isNaN(d.getTime()) && d.getFullYear() === y && d.getMonth() === m;
  }).length;
}
