"use client";

/**
 * generateShareCard(trade, currencySymbol) — renders a Binance/Bybit-style
 * P&L share card to canvas and downloads it as PNG.
 */
export function generateShareCard(t, sym = "$") {
  const W = 900;
  const H = 500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const pnl = Number(t.pnl) || 0;
  const win = pnl >= 0;
  const isLong = t.direction?.toLowerCase() === "long";
  const entry = t.avgEntryPrice || t.entryPrice || t.entries?.[0]?.price;
  const exit = t.avgExitPrice || t.exitPrice || t.exits?.[0]?.price;
  const notional = entry && t.totalQuantity ? entry * t.totalQuantity : null;
  const roi = notional ? (pnl / notional) * 100 : null;

  /* background gradient */
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#181a20");
  bg.addColorStop(0.55, "#1e2329");
  bg.addColorStop(1, win ? "#0f2e22" : "#2e0f16");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  /* glow accent */
  const glow = ctx.createRadialGradient(W - 140, 120, 10, W - 140, 120, 320);
  glow.addColorStop(0, win ? "rgba(46,189,133,0.28)" : "rgba(246,70,93,0.28)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  /* candle watermark */
  ctx.globalAlpha = 0.12;
  const candles = [200, 150, 260, 190, 300, 230, 320];
  candles.forEach((h, i) => {
    const x = W - 320 + i * 42;
    ctx.fillStyle = i % 2 === 0 ? "#2ebd85" : "#f6465d";
    ctx.fillRect(x, H - h - 60, 18, h);
    ctx.fillRect(x + 8, H - h - 90, 2, h + 60);
  });
  ctx.globalAlpha = 1;

  /* brand */
  ctx.fillStyle = "#fcd535";
  ctx.beginPath();
  ctx.roundRect(56, 48, 40, 40, 10);
  ctx.fill();
  ctx.fillStyle = "#1e2329";
  ctx.font = "700 24px Poppins, sans-serif";
  ctx.fillText("J", 70, 76);
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 26px Poppins, sans-serif";
  ctx.fillText("Journal", 110, 76);
  ctx.fillStyle = "#fcd535";
  ctx.fillText("X", 208, 76);

  /* symbol + side */
  ctx.fillStyle = "#eaecef";
  ctx.font = "600 34px Poppins, sans-serif";
  ctx.fillText(t.symbol || t.ticker || "—", 56, 160);
  const symW = ctx.measureText(t.symbol || t.ticker || "—").width;
  ctx.fillStyle = isLong ? "rgba(46,189,133,0.18)" : "rgba(246,70,93,0.18)";
  ctx.beginPath();
  ctx.roundRect(56 + symW + 16, 134, 110, 34, 17);
  ctx.fill();
  ctx.fillStyle = isLong ? "#2ebd85" : "#f6465d";
  ctx.font = "600 18px Poppins, sans-serif";
  ctx.fillText(isLong ? "Long" : "Short", 56 + symW + 38, 157);

  /* ROI big number */
  ctx.fillStyle = win ? "#2ebd85" : "#f6465d";
  ctx.font = "700 84px Poppins, sans-serif";
  const roiText = roi != null ? `${roi >= 0 ? "+" : ""}${roi.toFixed(2)}%` : `${win ? "+" : "−"}${sym}${Math.abs(pnl).toLocaleString()}`;
  ctx.fillText(roiText, 56, 268);

  /* P&L below */
  if (roi != null) {
    ctx.fillStyle = "#aeb4bc";
    ctx.font = "500 24px Poppins, sans-serif";
    ctx.fillText(`Net P&L  ${pnl >= 0 ? "+" : "−"}${sym}${Math.abs(pnl).toLocaleString()}`, 56, 312);
  }

  /* entry / exit / date row */
  const rows = [
    ["Entry", entry ? `${sym}${Number(entry).toLocaleString()}` : "—"],
    ["Exit", exit ? `${sym}${Number(exit).toLocaleString()}` : "—"],
    ["Closed", t.closeTime ? new Date(t.closeTime).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"],
  ];
  rows.forEach(([label, value], i) => {
    const x = 56 + i * 220;
    ctx.fillStyle = "#707a8a";
    ctx.font = "500 16px Poppins, sans-serif";
    ctx.fillText(label.toUpperCase(), x, 386);
    ctx.fillStyle = "#eaecef";
    ctx.font = "600 22px Poppins, sans-serif";
    ctx.fillText(value, x, 416);
  });

  /* footer */
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(56, 448);
  ctx.lineTo(W - 56, 448);
  ctx.stroke();
  ctx.fillStyle = "#707a8a";
  ctx.font = "500 15px Poppins, sans-serif";
  ctx.fillText("journalx.app — know your edge", 56, 478);

  /* download */
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `journalx_${(t.symbol || "trade").replace(/\W/g, "")}_${win ? "win" : "loss"}.png`;
  a.click();
}
