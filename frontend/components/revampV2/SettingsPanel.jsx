"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { LogOut, Upload, X } from "lucide-react";
import Badge from "./Badge";
import Button from "./Button";
import Dropdown from "./Dropdown";
import Toast from "./Toast";
import ExchangeConnectModal, { PLATFORMS } from "./ExchangeConnectModal";
import XpCard from "./XpCard";
import PlanLimitsCard from "./PlanLimitsCard";
import { useTheme } from "./Sidebar";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const CURRENCIES = ["USD", "USDT", "EUR", "INR", "GBP"];

/* ---------------- primitives ---------------- */

function Row({ title, sub, children, disabled }) {
  return (
    <div className="jx-setrow" style={disabled ? { opacity: 0.5, pointerEvents: "none" } : undefined}>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 180 }}>
        <span className="jx-setrow__title">
          {title} {disabled && <Badge variant="neutral">Soon</Badge>}
        </span>
        {sub && <span className="jx-setrow__sub">{sub}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>{children}</div>
    </div>
  );
}

function Switch({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      className={`jx-switch ${on ? "jx-switch--on" : ""}`}
      onClick={() => !disabled && onChange(!on)}
      aria-pressed={on}
      disabled={disabled}
      style={disabled ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
    />
  );
}

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
      style={{
        width: 14, height: 14, borderRadius: "50%", display: "inline-block",
        border: "2px solid color-mix(in srgb, currentColor 30%, transparent)",
        borderTopColor: "currentColor",
      }}
    />
  );
}

function Avatar({ url, name, size = 40 }) {
  const initials = (name || "U").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return url ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src={url} alt={name || "avatar"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--color-border)" }} />
  ) : (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: "var(--color-primary)",
      color: "var(--color-primary-foreground)", display: "flex", alignItems: "center",
      justifyContent: "center", fontWeight: 700, fontSize: size / 3,
    }}>
      {initials}
    </span>
  );
}

/* ---------------- avatar upload modal ---------------- */
function AvatarModal({ open, currentUrl, name, onClose, onSaved }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const pick = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Pick an image file");
    if (f.size > 2 * 1024 * 1024) return setError("Max 2MB");
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = async () => {
    if (!file) return setError("Choose an image first");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await axios.put(`${API_BASE}/api/auth/update-profile`, fd, { withCredentials: true });
      onSaved?.(res.data?.profile);
      setFile(null);
      setPreview(null);
      onClose?.();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Upload failed — try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose?.()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal jx-ltmodal--narrow"
            style={{ width: "min(420px, 96vw)" }}
          >
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>Profile photo</span>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }} disabled={saving}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "var(--space-5) var(--space-6)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
              <Avatar url={preview || currentUrl} name={name} size={120} />
              {error && <span style={{ font: "var(--text-small)", color: "var(--color-danger)" }}>{error}</span>}
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              <Button variant="outline" size="sm" icon={Upload} onClick={() => fileRef.current?.click()}>
                {preview ? "Choose another" : "Choose image"}
              </Button>
              <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                PNG or JPG · up to 2MB · stored on Backblaze
              </span>
            </div>

            <div className="jx-ltmodal__footer" style={{ justifyContent: "flex-end" }}>
              <button className="jx-btn jx-btn--ghost" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="jx-btn jx-btn--primary" onClick={save} disabled={saving || !file} style={{ minWidth: 120 }}>
                {saving ? <><Spinner /> Saving…</> : "Save photo"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================================================================ */
export default function SettingsPanel({ user }) {
  const { theme, toggleTheme } = useTheme();
  const [toast, setToast] = useState(null);
  const flash = (type, msg, ms = 3000) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), ms);
  };

  /* profile */
  const [name, setName] = useState(user?.name || "");
  const [initialName, setInitialName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [baseCurrency, setBaseCurrency] = useState(user?.baseCurrency || "USD");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);
  const profileDirty = name.trim() !== (initialName || "").trim();

  /* journals (from IndexedDB) */
  const [accounts, setAccounts] = useState([]);
  const [defaultJournal, setDefaultJournal] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");

  /* exchanges */
  const [connectPlatform, setConnectPlatform] = useState(null);
  const [binanceConnected, setBinanceConnected] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const userData = await getFromIndexedDB("user-data");
        setAccounts(userData?.accounts || []);
        if (userData?.avatarUrl && !user?.avatarUrl) setAvatarUrl(userData.avatarUrl);
      } catch {}
    })();
    if (user?.name) {
      setName(user.name);
      setInitialName(user.name);
    }
    setBaseCurrency(localStorage.getItem("jx-base-currency") || user?.baseCurrency || "USD");
    setDefaultJournal(localStorage.getItem("jx-default-journal") || Cookies.get("accountId") || "");
    setMonthlyTarget(localStorage.getItem("jx-monthly-target") || "");
    setBinanceConnected(!!localStorage.getItem("binance_api_key"));
    setAutoSync(localStorage.getItem("binance_auto_sync") !== "0");
    setLastSync(localStorage.getItem("binance_last_sync"));
  }, [user]);

  const saveProfile = async () => {
    if (!name.trim()) return flash("danger", "Name can't be empty");
    setSavingProfile(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("baseCurrency", baseCurrency);
      const res = await axios.put(`${API_BASE}/api/auth/update-profile`, fd, { withCredentials: true });
      const profile = res.data?.profile;
      try {
        const userData = (await getFromIndexedDB("user-data")) || {};
        await saveToIndexedDB("user-data", { ...userData, ...profile });
      } catch {}
      localStorage.setItem("userName", profile?.name || name.trim());
      setInitialName(profile?.name || name.trim());
      flash("success", "Profile updated");
    } catch (err) {
      console.error(err);
      flash("danger", err.response?.data?.message || "Could not save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const onAvatarSaved = async (profile) => {
    setAvatarUrl(profile?.avatarUrl || "");
    try {
      const userData = (await getFromIndexedDB("user-data")) || {};
      await saveToIndexedDB("user-data", { ...userData, avatarUrl: profile?.avatarUrl });
    } catch {}
    flash("success", "Profile photo updated");
  };

  const pickDefaultJournal = (id) => {
    setDefaultJournal(id);
    localStorage.setItem("jx-default-journal", id);
    Cookies.set("accountId", id, { expires: 365 });
    Cookies.set("selectedAccount", id, { expires: 365 });
    flash("success", "Default journal set — new trades log here");
  };

  const toggleAutoSync = (on) => {
    setAutoSync(on);
    localStorage.setItem("binance_auto_sync", on ? "1" : "0");
    flash("success", on ? "Auto-import enabled (every 30 min)" : "Auto-import paused");
  };

  const disconnectBinance = () => {
    localStorage.removeItem("binance_api_key");
    localStorage.removeItem("binance_secret_key");
    setBinanceConnected(false);
    flash("success", "Binance disconnected");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", width: "100%" }}>
      <Toast toast={toast} />

      <div>
        <div style={{ font: "var(--text-h2)" }}>Settings</div>
        <div style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
          Manage your profile, trading preferences, and connected accounts.
        </div>
      </div>

      {/* ===== Plan & limits ===== */}
      <PlanLimitsCard />

      {/* ===== Profile ===== */}
      <div className="jx-card">
        <div className="jx-card__title">Profile</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>How you appear across JournalX.</div>

        <Row title="Profile photo" sub="PNG or JPG, up to 2MB">
          <Avatar url={avatarUrl} name={name} />
          <Button variant="secondary" size="sm" icon={Upload} onClick={() => setShowAvatar(true)}>
            Upload
          </Button>
        </Row>

        <Row title="Display name" sub="Shown on your shared reports">
          <div className="jx-input" style={{ height: 38, width: 220 }}>
            <input value={name} placeholder="Your name" onChange={(e) => setName(e.target.value)} />
          </div>
        </Row>

        <Row title="Email" sub="Login email can't be changed">
          <div className="jx-input jx-input--disabled" style={{ height: 38, width: 240 }}>
            <input value={user?.email || ""} disabled readOnly />
          </div>
        </Row>

        <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: "var(--space-3)" }}>
          <button
            className="jx-btn jx-btn--primary"
            onClick={saveProfile}
            disabled={savingProfile || !profileDirty}
            style={{ minWidth: 130 }}
          >
            {savingProfile ? <><Spinner /> Saving…</> : "Save changes"}
          </button>
        </div>
      </div>

      {/* ===== Trading preferences ===== */}
      <div className="jx-card">
        <div className="jx-card__title">Trading preferences</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Defaults applied to new trades and journals.</div>

        <Row title="Default journal" sub="Where new trades are logged">
          <div style={{ width: 220 }}>
            <Dropdown
              value={defaultJournal}
              onChange={pickDefaultJournal}
              label="Your journals"
              placeholder="Pick a journal"
              options={accounts.map((a) => ({ value: a._id, label: a.name }))}
              triggerStyle={{ height: 38 }}
            />
          </div>
        </Row>

        <Row title="Base currency" sub="All dashboard values convert to this currency">
          <div style={{ width: 130 }}>
            <Dropdown
              value={baseCurrency}
              onChange={(v) => setBaseCurrency(v)}
              options={CURRENCIES}
              triggerStyle={{ height: 38 }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              /* localStorage only — no DB. Dashboard reads jx-base-currency
                 on mount and listens for the change event. */
              localStorage.setItem("jx-base-currency", baseCurrency);
              window.dispatchEvent(new CustomEvent("jx-currency-changed", { detail: baseCurrency }));
              flash("success", `Currency applied — dashboard now shows ${baseCurrency}`);
            }}
          >
            Apply
          </Button>
        </Row>

        <Row title="Monthly target" sub="Your P&L goal — tracked on the dashboard goal card">
          <div className="jx-input" style={{ height: 38, width: 140 }}>
            <input
              type="number"
              placeholder="e.g. 15000"
              value={monthlyTarget}
              onChange={(e) => setMonthlyTarget(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              /* localStorage only — no DB */
              const v = Number(monthlyTarget);
              if (!v || v <= 0) return flash("danger", "Enter a positive target");
              try {
                localStorage.setItem("jx-monthly-target", String(v));
                window.dispatchEvent(new CustomEvent("jx-target-changed", { detail: v }));
                flash("success", `Monthly target set to ${v.toLocaleString()} — see the goal card`);
              } catch (e) {
                console.error(e);
                flash("danger", "Could not save locally");
              }
            }}
          >
            Apply
          </Button>
        </Row>

        <Row title="Default risk per trade" sub="Used to suggest position size" disabled>
          <div className="jx-input jx-input--disabled" style={{ height: 38, width: 110 }}>
            <input value="1.0%" disabled readOnly />
          </div>
        </Row>

        <Row title="Position sizing model" sub="How size is calculated" disabled>
          <div className="jx-input jx-input--disabled" style={{ height: 38, width: 180 }}>
            <input value="Fixed fractional" disabled readOnly />
          </div>
        </Row>
      </div>

      {/* ===== Notifications (disabled) ===== */}
      <div className="jx-card" style={{ position: "relative" }}>
        <div className="jx-card__title">
          Notifications <Badge variant="neutral">Coming soon</Badge>
        </div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Choose what you want to hear about.</div>
        {[
          ["Trade fill alerts", "Notify when an order fills"],
          ["Daily summary email", "A recap of your day at market close"],
          ["Weekly performance recap", "Your stats every Monday"],
        ].map(([t, s]) => (
          <Row key={t} title={t} sub={s} disabled>
            <Switch on={false} onChange={() => {}} disabled />
          </Row>
        ))}
      </div>

      {/* ===== Appearance ===== */}
      <div className="jx-card">
        <div className="jx-card__title">Appearance</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Personalize how JournalX looks.</div>

        <Row title="Theme" sub="Light or dark">
          <div className="jx-seg jx-seg--inline">
            {["light", "dark"].map((t) => (
              <button key={t} className={`jx-seg__btn ${theme === t ? "jx-seg__btn--active" : ""}`} onClick={() => theme !== t && toggleTheme()}>
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </Row>

        <Row title="Compact mode" sub="Tighter spacing across the app" disabled>
          <Switch on={false} onChange={() => {}} disabled />
        </Row>
      </div>

      {/* ===== Connected exchanges ===== */}
      <div className="jx-card">
        <div className="jx-card__title">Connected exchanges</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>
          Auto-import trades via read-only API keys.
        </div>

        {PLATFORMS.map((p) => {
          const connected = p.id === "binance" && binanceConnected;
          return (
            <Row
              key={p.id}
              title={p.name}
              sub={
                connected
                  ? `Connected${lastSync ? ` · last sync ${new Date(lastSync).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}`
                  : p.live
                    ? "Not connected"
                    : "Coming soon"
              }
            >
              {connected && <Badge variant="success">● Connected</Badge>}
              {connected ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => setConnectPlatform(p.id)}>Manage</Button>
                  <Button variant="ghost" size="sm" onClick={disconnectBinance}>Disconnect</Button>
                </>
              ) : (
                <Button variant={p.live ? "primary" : "outline"} size="sm" onClick={() => setConnectPlatform(p.id)} disabled={!p.live && false}>
                  Connect
                </Button>
              )}
            </Row>
          );
        })}

        <Row title="Auto-import" sub="Pull new trades every 30 minutes in the background">
          <Switch on={autoSync} onChange={toggleAutoSync} disabled={!binanceConnected} />
        </Row>
      </div>

      {/* ===== XP ===== */}
      <XpCard />

      {/* ===== Account / session ===== */}
      <div className="jx-card">
        <div className="jx-card__title">Account</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Manage your session.</div>
        <Row title="Log out" sub="Sign out of JournalX on this device">
          <Button
            variant="outline"
            size="sm"
            icon={LogOut}
            onClick={() => {
              Cookies.remove("userId");
              Cookies.remove("accountId");
              Cookies.remove("isVerified");
              window.location.href = "/login";
            }}
          >
            Log out
          </Button>
        </Row>
      </div>

      {/* ===== Danger zone ===== */}
      <div className="jx-card" style={{ borderColor: "var(--color-danger)" }}>
        <div className="jx-card__title" style={{ color: "var(--color-danger)" }}>Danger zone</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Irreversible actions — proceed with care.</div>
        <Row title="Export account data" sub="Download everything as a ZIP" disabled>
          <Button variant="outline" size="sm" disabled>Export</Button>
        </Row>
        <Row title="Delete account" sub="Permanently remove your account and data">
          <Button variant="danger" size="sm" onClick={() => flash("danger", "Contact support to delete your account")}>
            Delete account
          </Button>
        </Row>
      </div>

      {/* modals */}
      <AvatarModal
        open={showAvatar}
        currentUrl={avatarUrl}
        name={name}
        onClose={() => setShowAvatar(false)}
        onSaved={onAvatarSaved}
      />
      <ExchangeConnectModal
        open={!!connectPlatform}
        platform={connectPlatform}
        onClose={() => {
          setConnectPlatform(null);
          setBinanceConnected(!!localStorage.getItem("binance_api_key"));
        }}
        onImported={() => setLastSync(new Date().toISOString())}
      />
    </div>
  );
}
