/* Best-effort mapping from a user's symbol (e.g. "BTC/USDT", "XAU/USD",
   "EURUSD", "AAPL", "NIFTY") to a TradingView symbol. TradingView resolves
   bare tickers, so when unsure we just return the cleaned symbol. */
const CURRENCIES = new Set([
  "USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "INR", "CNY", "HKD", "SGD",
]);
const CRYPTO_QUOTES = new Set(["USDT", "USDC", "BUSD", "BTC", "ETH"]);

export function toTvSymbol(raw) {
  if (!raw) return "BINANCE:BTCUSDT";
  const s = String(raw).toUpperCase().trim();
  const clean = s.replace(/[\s/\-]/g, "");

  // metals
  if (clean === "XAUUSD" || clean === "GOLD") return "OANDA:XAUUSD";
  if (clean === "XAGUSD" || clean === "SILVER") return "OANDA:XAGUSD";
  if (clean === "WTI" || clean === "USOIL" || clean === "CL") return "TVC:USOIL";

  // indices
  if (clean === "NIFTY" || clean === "NIFTY50") return "NSE:NIFTY";
  if (clean === "BANKNIFTY") return "NSE:BANKNIFTY";
  if (clean === "SPX" || clean === "SPX500" || clean === "US500") return "TVC:SPX";
  if (clean === "NDX" || clean === "NAS100") return "NASDAQ:NDX";

  const base = clean.slice(0, -4);
  const quote4 = clean.slice(-4);
  const last3 = clean.slice(-3);
  const first3 = clean.slice(0, 3);

  // crypto pair (BTC/USDT → BINANCE:BTCUSDT)
  if (CRYPTO_QUOTES.has(quote4) || CRYPTO_QUOTES.has(last3)) {
    return `BINANCE:${clean}`;
  }

  // forex pair (EUR/USD, GBPJPY) — 6 chars, both halves are currencies
  if (clean.length === 6 && CURRENCIES.has(first3) && CURRENCIES.has(last3)) {
    return `FX:${clean}`;
  }

  // otherwise assume an equity / let TradingView resolve the bare ticker
  return clean;
}
