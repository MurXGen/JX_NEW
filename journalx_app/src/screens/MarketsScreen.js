import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { H1, Muted } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { font } from "../theme/typography";

let WebView = null;
try { WebView = require("react-native-webview").WebView; } catch {}

export default function MarketsScreen() {
  const { theme } = useTheme();
  const dark = theme.mode !== "light";
  const bg = theme.bg.canvas;

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:${bg};height:100%}</style>
</head><body>
<div class="tradingview-widget-container" style="height:100%">
  <div class="tradingview-widget-container__widget"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js" async>
  {
    "colorTheme": "${dark ? "dark" : "light"}",
    "dateRange": "1D",
    "showChart": true,
    "locale": "en",
    "isTransparent": true,
    "showSymbolLogo": true,
    "width": "100%",
    "height": "100%",
    "tabs": [
      { "title": "Indices", "symbols": [
        {"s":"FOREXCOM:SPXUSD","d":"S&P 500"},
        {"s":"FOREXCOM:NSXUSD","d":"Nasdaq 100"},
        {"s":"NSE:NIFTY","d":"Nifty 50"},
        {"s":"NSE:BANKNIFTY","d":"Bank Nifty"}
      ]},
      { "title": "Forex & metals", "symbols": [
        {"s":"FX:EURUSD","d":"EUR/USD"},
        {"s":"FX:GBPUSD","d":"GBP/USD"},
        {"s":"OANDA:XAUUSD","d":"Gold"},
        {"s":"TVC:USOIL","d":"Crude Oil"}
      ]},
      { "title": "Crypto", "symbols": [
        {"s":"BINANCE:BTCUSDT","d":"Bitcoin"},
        {"s":"BINANCE:ETHUSDT","d":"Ethereum"},
        {"s":"BINANCE:SOLUSDT","d":"Solana"}
      ]}
    ]
  }
  </script>
</div>
</body></html>`;

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <View style={{ paddingHorizontal: theme.space[5], paddingTop: theme.space[3], paddingBottom: theme.space[2] }}>
        <H1>Markets</H1>
        <Muted>Live indices, forex, metals and crypto.</Muted>
      </View>
      {WebView ? (
        <View style={{ flex: 1, marginHorizontal: theme.space[4], marginBottom: 96, borderRadius: theme.radius.xl, overflow: "hidden", borderWidth: 1, borderColor: theme.glass.border }}>
          <WebView source={{ html }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled style={{ flex: 1, backgroundColor: theme.bg.canvas }} />
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ color: theme.text.muted, fontFamily: font(500), textAlign: "center" }}>
            Markets need the app build (react-native-webview).
          </Text>
        </View>
      )}
    </SafeAreaView>
    </GradientBackground>
  );
}
