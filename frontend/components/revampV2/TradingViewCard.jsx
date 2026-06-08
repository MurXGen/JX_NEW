"use client";

/* Settings card — TradingView integration. Fetches the user's webhook
   token, shows the webhook URL, and gives copy-paste setup steps for
   the JournalX Pine "Trade Marker" indicator. */

import { useEffect, useState } from "react";
import axios from "axios";
import { Check, Copy, ExternalLink, KeyRound, RefreshCw } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function CopyField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch {}
  };
  return (
    <div className="jx-field">
      <span className="jx-sidebar__section" style={{ padding: 0 }}>{label}</span>
      <div className="jx-input" style={{ paddingRight: 4 }}>
        <input readOnly value={value} style={mono ? { fontFamily: "monospace", fontSize: 12 } : undefined} />
        <button className="jx-btn jx-btn--ghost jx-btn--sm" onClick={copy} aria-label="Copy">
          {copied ? <Check size={14} style={{ color: "var(--color-success)" }} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}

export default function TradingViewCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/integrations/tradingview/token`, { withCredentials: true });
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rotate = async () => {
    if (!confirm("Rotate token? Your existing TradingView alert will stop working until you update it.")) return;
    try {
      const res = await axios.post(`${API_BASE}/api/integrations/tradingview/token/rotate`, {}, { withCredentials: true });
      setData((d) => ({ ...d, token: res.data.token }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="jx-card">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: 4 }}>
        <span className="jx-card__title">TradingView</span>
        <Badge variant="brand">Beta</Badge>
      </div>
      <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-3)" }}>
        Mark trades right on your TradingView chart and log them to JournalX automatically — no screenshots needed.
      </div>

      {loading ? (
        <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)" }}>Loading your webhook…</span>
      ) : !data ? (
        <span style={{ font: "var(--text-small)", color: "var(--color-danger)" }}>Could not load — refresh and try again.</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <CopyField label="Webhook URL" value={data.webhookUrl} />
          <CopyField label="Your token" value={data.token} />
          <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
            <Button variant="ghost" size="sm" icon={RefreshCw} onClick={rotate}>Rotate token</Button>
            <Button variant="outline" size="sm" icon={ExternalLink} onClick={() => window.open("https://www.tradingview.com/support/solutions/43000529348-about-webhooks/", "_blank", "noopener")}>
              Webhook docs
            </Button>
          </div>

          <button className="jx-sidebar__item" style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-muted)", justifyContent: "space-between" }} onClick={() => setOpen((o) => !o)}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <KeyRound size={15} /> Setup steps
            </span>
            <span style={{ color: "var(--color-text-muted)" }}>{open ? "Hide" : "Show"}</span>
          </button>

          {open && (
            <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8, font: "var(--text-small)", color: "var(--color-text-secondary)" }}>
              <li>In TradingView, open the indicators panel and add <strong>“JournalX — Trade Marker”</strong> (publish the provided Pine script to your account, then add it to a chart).</li>
              <li>In the indicator settings, paste your token above into the <code>token</code> field of the alert message, or just use the alert template — drag the <strong>Entry</strong> and <strong>Exit</strong> points to your trade.</li>
              <li>Pick direction (Long/Short), size and unit, and any stop / take-profit.</li>
              <li>Right-click the chart → <strong>Add alert</strong> → Condition: <em>JournalX — Trade Marker</em> → “Any alert() function call”. Under Notifications, enable <strong>Webhook URL</strong> and paste the URL above.</li>
              <li>Toggle <strong>“Position closed”</strong> on the indicator when you exit — the alert fires and the trade appears in your Trades log, with the entry/exit chart drawn on the details page.</li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
