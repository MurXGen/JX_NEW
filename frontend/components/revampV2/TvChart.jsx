"use client";

/* TradingView Advanced Chart for any instrument (stocks, forex, XAUUSD,
   futures, indices, crypto). Free, view-only embed via tv.js. Theme follows
   the app's current [data-theme]. */
import { useEffect, useRef } from "react";
import { toTvSymbol } from "@/utils/tvSymbol";

let tvScriptPromise = null;
function loadTv() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.TradingView) return Promise.resolve();
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("tv-load-failed"));
    document.head.appendChild(s);
  });
  return tvScriptPromise;
}

export default function TvChart({ symbol, height = 420 }) {
  const ref = useRef(null);
  const idRef = useRef(`tv_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    const tvSymbol = toTvSymbol(symbol);
    const isDark =
      typeof document !== "undefined" &&
      (document.documentElement.getAttribute("data-theme") || "dark") !== "light";

    loadTv()
      .then(() => {
        if (cancelled || !ref.current || !window.TradingView) return;
        ref.current.innerHTML = "";
        const mount = document.createElement("div");
        mount.id = idRef.current;
        mount.style.height = "100%";
        ref.current.appendChild(mount);
        // eslint-disable-next-line new-cap
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: "60",
          timezone: "Etc/UTC",
          theme: isDark ? "dark" : "light",
          style: "1",
          locale: "en",
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: true,
          container_id: idRef.current,
        });
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [symbol]);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        border: "1px solid var(--color-border)",
      }}
    >
      <div ref={ref} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
