#!/usr/bin/env bash
# ============================================================
#  JournalX — TradingView webhook test
#  Simulates the alert TradingView would POST, so you can verify
#  the trade lands in your journal WITHOUT setting up a chart.
#
#  Usage:
#    1) Get your token:  GET /api/integrations/tradingview/token
#       (open the dashboard → Settings → TradingView, copy the token)
#    2) Run:  ./test-webhook.sh <API_BASE> <TOKEN>
#       e.g.  ./test-webhook.sh http://localhost:5001 abc123yourtoken
# ============================================================
set -e

API_BASE="${1:-http://localhost:5001}"
TOKEN="${2:?Pass your JournalX TradingView token as the 2nd argument}"

NOW_MS=$(($(date +%s) * 1000))
ENTRY_MS=$((NOW_MS - 3600000))   # 1h ago

curl -sS -X POST "$API_BASE/api/integrations/tradingview" \
  -H "Content-Type: application/json" \
  -d "{
    \"source\": \"tradingview\",
    \"token\": \"$TOKEN\",
    \"symbol\": \"BTCUSDT\",
    \"exchange\": \"BINANCE\",
    \"direction\": \"long\",
    \"entryPrice\": 61240,
    \"exitPrice\": 63820,
    \"stopPrice\": 60100,
    \"takeProfit\": 66540,
    \"sizeUnit\": \"asset\",
    \"size\": 0.5,
    \"assetQty\": 0.5,
    \"leverage\": 1,
    \"entryTime\": $ENTRY_MS,
    \"exitTime\": $NOW_MS,
    \"pnl\": 1290,
    \"strategy\": \"Breakout\",
    \"note\": \"Test trade from webhook script\",
    \"timeframe\": \"60\"
  }"

echo ""
echo "✅ Sent. Open your Trades log — a BTCUSDT long should appear with a marked chart in its details."
