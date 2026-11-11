/* Quick-log a trade (symbol + net P&L) with the same payload the Log Trade
   modal sends in "Only P&L" mode, then mirror its side effects (IndexedDB
   cache, tracking sheet, Drive backup) without reloading the page.
   Throws { code: "LIMIT", message } when the plan's monthly cap is hit. */

import axios from "axios";
import Cookies from "js-cookie";
import { canAddTrade, getPlanRules } from "@/utils/planRestrictions";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { logTradeToSheet, tradeToSheetPayload } from "@/utils/tradeSheetLog";
import { scheduleAutoBackup } from "@/utils/driveBackup";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function quickLogTrade({ accountId, symbol, direction = "long", pnl }) {
  if (!accountId) throw new Error("Select a journal to log into first");

  // plan limit, same check the modal runs before saving
  try {
    const userData = await getFromIndexedDB("user-data");
    if (!(await canAddTrade(userData))) {
      const limit = getPlanRules(userData).limits.tradeLimitPerMonth;
      const err = new Error(`You've logged all ${limit} trades on your Free plan this month.`);
      err.code = "LIMIT";
      throw err;
    }
  } catch (e) {
    if (e?.code === "LIMIT") throw e;
  }

  Cookies.set("accountId", accountId, { expires: 365 });
  try { localStorage.setItem("jx-account-id", accountId); } catch {}

  const now = new Date().toISOString();
  const value = Number(pnl) || 0;
  const fd = new FormData();
  fd.append("accountId", accountId);
  fd.append("symbol", symbol.trim().toUpperCase());
  fd.append("direction", direction);
  fd.append("tradeStatus", "quick");
  fd.append("quantityUSD", 0);
  fd.append("leverage", 1);
  fd.append("totalQuantity", 0);
  fd.append("sizeUnit", "asset");
  fd.append("entries", "[]");
  fd.append("exits", "[]");
  fd.append("sls", "[]");
  fd.append("tps", "[]");
  fd.append("avgEntryPrice", 0);
  fd.append("avgExitPrice", 0);
  fd.append("avgSLPrice", 0);
  fd.append("avgTPPrice", 0);
  fd.append("expectedProfit", 0);
  fd.append("expectedLoss", 0);
  fd.append("rr", "");
  fd.append("feeType", "percent");
  fd.append("openFeeValue", 0);
  fd.append("feeAmount", 0);
  fd.append("pnl", value);
  fd.append("pnlAfterFee", value);
  fd.append("openTime", now);
  fd.append("closeTime", now);
  fd.append("duration", 0);
  fd.append("reason", "[]");
  fd.append("learnings", "");
  fd.append("rulesFollowed", false);
  fd.append("strategy", "");
  fd.append("marketCondition", "");
  fd.append("timeframe", "");
  fd.append("confidence", 0);
  fd.append("emotion", "");
  fd.append("mistakes", "[]");

  let res;
  try {
    res = await axios.post(`${API_BASE}/api/trades/addd`, fd, { withCredentials: true });
  } catch (err) {
    if (err.response?.status === 403 && err.response?.data?.code === "LIMIT") {
      const e = new Error(err.response.data.message || "You've hit your Free plan trade limit.");
      e.code = "LIMIT";
      throw e;
    }
    throw new Error(err.response?.data?.message || "Could not save trade, try again");
  }
  const trade = res.data?.trade;

  if (trade) {
    try { logTradeToSheet(tradeToSheetPayload(trade, "manual")); } catch {}
    try {
      const userData = (await getFromIndexedDB("user-data")) || {};
      userData.trades = [...(userData.trades || []), trade];
      await saveToIndexedDB("user-data", userData);
    } catch {}
    try { scheduleAutoBackup(); } catch {}
  }
  return trade;
}
