"use client";

/* Client-side trade logging to a Google Form (no backend / DB involved).
 *
 * When a trade is logged in the browser we POST a row to a Google Form's
 * /formResponse endpoint using mode:"no-cors" (Google Forms accepts the
 * submission even though we can't read the opaque response). This is purely
 * fire-and-forget — it must NEVER block, delay, or throw into the trade flow.
 *
 * ── Form ───────────────────────────────────────────────────────────────
 * https://docs.google.com/forms/d/e/1FAIpQLSec7-Q4ncUyqo71pmCmg8sewqNdnFgbL61aiId2xtVTPmtP2g
 *
 * ── Field mapping (entry id → meaning) ─────────────────────────────────
 * The order below assumes the form fields are, top to bottom:
 *   1. User name      2. User email   3. User ID     4. Trade ID
 *   5. Symbol         6. Direction    7. P&L         8. Journal / Account
 *   9. Source        10. Environment
 * (Google Forms adds its own Timestamp column automatically.)
 * If your form's field order is different, just re-map the entry ids here.
 */

import { getFromIndexedDB } from "@/utils/indexedDB";

const FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSec7-Q4ncUyqo71pmCmg8sewqNdnFgbL61aiId2xtVTPmtP2g/formResponse";

const FIELD = {
  name: "entry.1047544069",
  email: "entry.560811905",
  userId: "entry.1378974805",
  tradeId: "entry.1772445606",
  symbol: "entry.486296939",
  direction: "entry.2092891699",
  pnl: "entry.1117016816",
  journal: "entry.459286016",
  source: "entry.971656977",
  env: "entry.1058719238",
};

async function resolveUser() {
  // 1) try the locally cached user (fast, offline-friendly)
  try {
    const u = (await getFromIndexedDB("user-data")) || {};
    const name = u.name || u.fullName || "";
    const email = u.email || "";
    const userId = u.userId || u._id || u.id || "";
    if (name || email || userId) return { name, email, userId };
  } catch {}
  // 2) fall back to the authenticated user-info endpoint
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/user-info`,
      { credentials: "include" },
    );
    const j = await res.json();
    const d = j?.userData || j || {};
    return {
      name: d.name || d.fullName || "",
      email: d.email || "",
      userId: d.userId || d._id || "",
    };
  } catch {}
  return { name: "", email: "", userId: "" };
}

/**
 * Log a single trade to the sheet. `trade` accepts:
 *   { tradeId, symbol, direction, pnl, journal, source }
 * Any missing field is simply omitted.
 */
export async function logTradeToSheet(trade = {}) {
  try {
    if (typeof window === "undefined") return;
    const user = await resolveUser();

    const fd = new FormData();
    const put = (key, val) => {
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        fd.append(key, String(val));
      }
    };

    put(FIELD.name, user.name);
    put(FIELD.email, user.email);
    put(FIELD.userId, user.userId);
    put(FIELD.tradeId, trade.tradeId);
    put(FIELD.symbol, trade.symbol);
    put(FIELD.direction, trade.direction);
    put(FIELD.pnl, trade.pnl);
    put(FIELD.journal, trade.journal);
    put(FIELD.source, trade.source);
    put(
      FIELD.env,
      process.env.NODE_ENV === "production" ? "production" : "development",
    );

    await fetch(FORM_ACTION, { method: "POST", mode: "no-cors", body: fd });
  } catch {
    /* never let sheet logging affect the trade flow */
  }
}

/** Helper to pull the common fields off a backend trade object. */
export function tradeToSheetPayload(trade = {}, source = "manual") {
  return {
    tradeId: trade._id || trade.id || "",
    symbol: trade.symbol || trade.ticker || "",
    direction: trade.direction || "",
    pnl: trade.pnl,
    journal: trade.accountName || trade.account?.accountName || trade.account || "",
    source: trade.source || source,
  };
}
