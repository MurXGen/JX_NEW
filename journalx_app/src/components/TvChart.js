/* TradingView Advanced Chart for any instrument, rendered in a WebView.
   Free, view-only widget — covers stocks, forex, XAUUSD, futures, indices,
   crypto. Lazy-requires react-native-webview so the app still bundles in
   environments where it isn't installed yet. */
import React from "react";
import { Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { toTvSymbol } from "../lib/tvSymbol";
import { font } from "../theme/typography";

let WebView = null;
try {
  WebView = require("react-native-webview").WebView;
} catch {}

export default function TvChart({ symbol, height = 360 }) {
  const { theme } = useTheme();
  const tvSymbol = toTvSymbol(symbol);
  const tvTheme = theme.mode === "light" ? "light" : "dark";
  const bg = theme.bg.surface;

  if (!WebView) {
    return (
      <View style={{ height, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.text.muted, fontFamily: font(500), fontSize: theme.font.small }}>
          Chart needs the app build (react-native-webview).
        </Text>
      </View>
    );
  }

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{height:100%;margin:0;padding:0;background:${bg};overflow:hidden}#tv{height:100%;width:100%}</style>
</head><body>
<div class="tradingview-widget-container" style="height:100%;width:100%"><div id="tv"></div></div>
<script src="https://s3.tradingview.com/tv.js"></script>
<script>
  try {
    new TradingView.widget({
      autosize: true,
      symbol: ${JSON.stringify(tvSymbol)},
      interval: "60",
      timezone: "Etc/UTC",
      theme: ${JSON.stringify(tvTheme)},
      style: "1",
      locale: "en",
      toolbar_bg: ${JSON.stringify(bg)},
      hide_top_toolbar: false,
      hide_legend: false,
      allow_symbol_change: true,
      container_id: "tv"
    });
  } catch (e) {}
</script>
</body></html>`;

  return (
    <View style={{ height, borderRadius: theme.radius.md, overflow: "hidden", borderWidth: 1, borderColor: theme.border }}>
      <WebView
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        style={{ backgroundColor: bg }}
      />
    </View>
  );
}
