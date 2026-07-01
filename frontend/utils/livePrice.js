/* livePrice.js — live spot prices from Binance's public API (no key,
   CORS-enabled). 30s in-memory cache per symbol. Non-crypto symbols
   return null so callers can fall back to simulation. */

const cache = {};

export const toBinanceSymbol = (sym) => {
  const s = (sym || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!s) return null;
  if (/(USDT|USDC|FDUSD)$/.test(s)) return s;
  if (s.endsWith("USD") && s.length <= 7) return `${s}T`; // BTCUSD → BTCUSDT (best effort)
  return null;
};

/* True only for symbols we can pull a real candle feed for (crypto pairs on
   Binance). Everything else (stocks, futures, forex) has no live markable
   chart — callers use this to hide approximated charts and to disable the
   "Log on chart" toggle. */
export const hasLiveCandles = (sym) => !!toBinanceSymbol(sym);

export async function getLivePrice(symbol) {
  const b = toBinanceSymbol(symbol);
  if (!b) return null;

  const hit = cache[b];
  if (hit && Date.now() - hit.ts < 30_000) return hit.price;

  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${b}`);
    if (!res.ok) return null;
    const data = await res.json();
    const price = Number(data?.price);
    if (!price) return null;
    cache[b] = { price, ts: Date.now() };
    return price;
  } catch {
    return null;
  }
}
