/* Generic TradingView embed inside a WebView — the app equivalent of the web
   MarketsPanel's TVWidget. Renders any embed-widget-<script> with a config. */
import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

let WebView = null;
try { WebView = require("react-native-webview").WebView; } catch {}

export default function TvWidget({ script, config, height = 320, radius = 16 }) {
  const { theme } = useTheme();
  const dark = theme.mode !== "light";
  const cfg = { colorTheme: dark ? "dark" : "light", locale: "en", isTransparent: true, width: "100%", height: "100%", ...config };

  const html = `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent;height:100%;overflow:hidden}
.tradingview-widget-copyright{display:none!important}</style>
</head><body>
<div class="tradingview-widget-container" style="height:100%;width:100%">
  <div class="tradingview-widget-container__widget" style="height:100%;width:100%"></div>
  <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-${script}.js" async>
  ${JSON.stringify(cfg)}
  </script>
</div>
</body></html>`;

  if (!WebView) {
    return <View style={{ height, borderRadius: radius, backgroundColor: theme.bg.muted }} />;
  }
  return (
    <View style={{ height, borderRadius: radius, overflow: "hidden", backgroundColor: theme.bg.surface, borderWidth: 1, borderColor: theme.border }}>
      <WebView
        source={{ html }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        scrollEnabled
        startInLoadingState
        androidLayerType="hardware"
        style={{ flex: 1, backgroundColor: "transparent" }}
      />
    </View>
  );
}
