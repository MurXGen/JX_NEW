"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { CloudUpload, CloudDownload, HardDriveDownload, LogOut, Upload, X, Gift, Copy, Check, Share2, Mail, Send, MessageCircle, Twitter, ExternalLink, User, CreditCard, SlidersHorizontal, Bell, Palette, Plug, ShieldAlert } from "lucide-react";

/* Settings sections — rendered as a left nav, one section at a time */
const SETTINGS_TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Plan & billing", icon: CreditCard },
  { id: "preferences", label: "Trading preferences", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "backup", label: "Backup & restore", icon: CloudUpload },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "refer", label: "Refer a friend", icon: Gift },
  { id: "danger", label: "Danger zone", icon: ShieldAlert },
];
import Badge from "./Badge";
import Button from "./Button";
import Dropdown from "./Dropdown";
import Toast from "./Toast";
import ExchangeConnectModal, { PLATFORMS } from "./ExchangeConnectModal";
import PlanLimitsCard from "./PlanLimitsCard";
import { useTheme } from "./Sidebar";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { backupToDrive, restoreFromDrive, isDriveConfigured } from "@/utils/driveBackup";

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

/* Refer a friend — shares the /refer landing link via native share + fallbacks */
function ReferAFriend({ userId }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  const message =
    "I'm using JournalX to journal my trades and find my edge — start free, no card:";

  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://journalx.app";
    setLink(`${origin}/refer${userId ? `?ref=${encodeURIComponent(userId)}` : ""}`);
  }, [userId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  const nativeShare = async () => {
    try {
      await navigator.share({ title: "JournalX", text: message, url: link });
    } catch {}
  };
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const enc = encodeURIComponent;
  const shareLinks = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${enc(`${message} ${link}`)}` },
    { label: "Telegram", icon: Send, href: `https://t.me/share/url?url=${enc(link)}&text=${enc(message)}` },
    { label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(link)}` },
    { label: "Email", icon: Mail, href: `mailto:?subject=${enc("Join me on JournalX")}&body=${enc(`${message}\n\n${link}`)}` },
  ];

  return (
    <div className="jx-card">
      <div className="jx-card__title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Gift size={18} style={{ color: "var(--yellow-500)" }} /> Refer a friend
      </div>
      <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-3)" }}>
        Invite traders to JournalX — they start free, no card required.
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
        <div className="jx-input" style={{ flex: 1, minWidth: 220, height: 42 }}>
          <input value={link} readOnly onFocus={(e) => e.target.select()} aria-label="Your referral link" />
        </div>
        <Button variant="secondary" onClick={copy} icon={copied ? Check : Copy}>
          {copied ? "Copied" : "Copy link"}
        </Button>
        {canNativeShare && (
          <Button variant="primary" onClick={nativeShare} icon={Share2}>
            Share
          </Button>
        )}
      </div>

      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-3)" }}>
        {shareLinks.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="jx-btn jx-btn--secondary jx-btn--sm"
            style={{ textDecoration: "none" }}
          >
            <s.icon size={15} /> {s.label}
          </a>
        ))}
      </div>
    </div>
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

/* Resize + compress an image File into a small JPEG data URL so the avatar
   works and persists entirely client-side (no backend dependency). */
function compressImage(file, max = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        try {
          resolve(canvas.toDataURL("image/jpeg", quality));
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
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
      // Always produce a compressed local data URL so the photo is saved
      // and shown even if the backend upload isn't available.
      let dataUrl = "";
      try {
        dataUrl = await compressImage(file, 256, 0.85);
      } catch {
        dataUrl = preview || "";
      }

      // Best-effort server upload (keeps cross-device sync when supported).
      let serverUrl = "";
      try {
        const fd = new FormData();
        fd.append("avatar", file);
        const res = await axios.put(`${API_BASE}/api/auth/update-profile`, fd, { withCredentials: true });
        serverUrl = res.data?.profile?.avatarUrl || "";
      } catch (e) {
        console.warn("Avatar server upload unavailable, using local image:", e?.message);
      }

      onSaved?.({ avatarUrl: serverUrl || dataUrl });
      setFile(null);
      setPreview(null);
      onClose?.();
    } catch (err) {
      console.error(err);
      setError("Upload failed — try again");
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
  const [tab, setTab] = useState("profile"); // active settings section
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

  /* backup & restore (Google Drive) */
  const driveReady = isDriveConfigured();
  const [lastBackup, setLastBackup] = useState(null);
  const [lastRestore, setLastRestore] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userData = await getFromIndexedDB("user-data");
        setAccounts(userData?.accounts || []);
        const cachedAvatar = userData?.avatarUrl || (typeof window !== "undefined" && localStorage.getItem("jx-avatar")) || "";
        if (cachedAvatar && !user?.avatarUrl) setAvatarUrl(cachedAvatar);
        // Base (display) currency defaults to the ACTIVE journal's currency;
        // an explicit override (jx-display-currency) wins if the user set one.
        const accId = (typeof window !== "undefined" && (Cookies.get("accountId") || localStorage.getItem("jx-default-journal"))) || "";
        const acc = (userData?.accounts || []).find((a) => a._id === accId) || (userData?.accounts || [])[0];
        const journalCur = (acc?.currency || "USD").toUpperCase();
        const override = localStorage.getItem("jx-display-currency");
        setBaseCurrency(override || journalCur);
      } catch {}
    })();
    if (user?.name) {
      setName(user.name);
      setInitialName(user.name);
    }
    setDefaultJournal(localStorage.getItem("jx-default-journal") || Cookies.get("accountId") || "");
    setMonthlyTarget(localStorage.getItem("jx-monthly-target") || "");
    setBinanceConnected(!!localStorage.getItem("binance_api_key"));
    setAutoSync(localStorage.getItem("binance_auto_sync") !== "0");
    setLastSync(localStorage.getItem("binance_last_sync"));
    setLastBackup(localStorage.getItem("jx-last-backup"));
    setLastRestore(localStorage.getItem("jx-last-restore"));
  }, [user]);

  const fmtWhen = (iso) => {
    if (!iso) return "Never";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "Never" : d.toLocaleString();
  };

  const doBackup = async () => {
    setBackingUp(true);
    try {
      // interactive:true → uses the silent token when already connected (no
      // popup); only prompts if Drive was never connected.
      const when = await backupToDrive({ interactive: true });
      setLastBackup(when);
      flash("success", "Backup saved to Google Drive");
    } catch (e) {
      flash(
        "danger",
        e.message === "not-configured"
          ? "Google Drive backup isn't configured yet"
          : e.message || "Backup failed — try again",
      );
    } finally {
      setBackingUp(false);
    }
  };

  const doRestore = async () => {
    if (!window.confirm("Restore will replace your current local data with your last Google Drive backup. Continue?")) return;
    setRestoring(true);
    try {
      const { restoredAt } = await restoreFromDrive({ interactive: true });
      setLastRestore(restoredAt);
      flash("success", "Data restored from Drive — reloading…");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      flash(
        "danger",
        e.message === "no-backup"
          ? "No backup found on your Drive yet"
          : e.message === "in-progress"
            ? "A restore is already running"
            : e.message === "not-configured"
              ? "Google Drive backup isn't configured yet"
              : e.message || "Restore failed — try again",
      );
    } finally {
      setRestoring(false);
    }
  };

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
    const url = profile?.avatarUrl || "";
    setAvatarUrl(url);
    try {
      const userData = (await getFromIndexedDB("user-data")) || {};
      await saveToIndexedDB("user-data", { ...userData, avatarUrl: url });
    } catch {}
    try {
      if (url) localStorage.setItem("jx-avatar", url);
    } catch {}
    window.dispatchEvent(new CustomEvent("jx-avatar-changed", { detail: url }));
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

  const logout = () => {
    Cookies.remove("userId");
    Cookies.remove("accountId");
    Cookies.remove("isVerified");
    window.location.href = "/login";
  };

  const visibleTabs = SETTINGS_TABS.filter((t) => t.id !== "backup" || driveReady);

  return (
    <div className="jx-settings">
      <Toast toast={toast} />

      <aside className="jx-settings__nav">
        <div className="jx-settings__navtitle">Settings</div>
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`jx-settings__navitem ${tab === t.id ? "jx-settings__navitem--active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={16} /> <span>{t.label}</span>
          </button>
        ))}
      </aside>

      <div className="jx-settings__content">
      {/* ===== Profile ===== */}
      {tab === "profile" && (
      <div className="jx-card">
        <div className="jx-card__title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
          <span>Profile</span>
          <button
            className="jx-btn jx-btn--outline jx-btn--sm"
            onClick={logout}
            style={{ color: "var(--color-danger)", borderColor: "var(--color-danger)" }}
          >
            <LogOut size={15} /> Log out
          </button>
        </div>

        {/* identity header — user details at a glance */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "var(--space-2) 0 var(--space-4)" }}>
          <Avatar url={avatarUrl} name={name} size={54} />
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ font: "var(--text-h3)", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name || "Your name"}
            </span>
            <span style={{ font: "var(--text-small)", color: "var(--color-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email || ""}
            </span>
          </div>
        </div>

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

      )}

      {/* ===== Refer a friend ===== */}
      {tab === "refer" && <ReferAFriend userId={user?._id || user?.id} />}

      {/* ===== Plan & billing ===== */}
      {tab === "billing" && <PlanLimitsCard />}

      {/* ===== Trading preferences ===== */}
      {tab === "preferences" && (
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

        <Row title="Display currency" sub="Converts dashboard & trades-log values for viewing. Each journal still stores its own currency.">
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
              /* Display-only override (no DB). Dashboard converts journal→display
                 at view time; journal balances stay in their own currency. */
              localStorage.setItem("jx-display-currency", baseCurrency);
              window.dispatchEvent(new CustomEvent("jx-currency-changed", { detail: baseCurrency }));
              flash("success", `Dashboard now displays in ${baseCurrency}`);
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

      )}

      {/* ===== Backup & restore (Google Drive) ===== */}
      {tab === "backup" && driveReady && (
      <div className="jx-card">
        <div className="jx-card__title">Backup &amp; restore</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>
          Save a private copy of your journal to your Google Drive, and restore it on any device.
        </div>

        <Row title="Back up to Google Drive" sub={`Last backup: ${fmtWhen(lastBackup)}`}>
          <Button
            variant="secondary"
            size="sm"
            icon={CloudUpload}
            onClick={doBackup}
            disabled={!driveReady || backingUp || restoring}
          >
            {backingUp ? <><Spinner /> Backing up…</> : "Back up now"}
          </Button>
        </Row>

        <Row title="Restore from Google Drive" sub={`Last restore: ${fmtWhen(lastRestore)}`}>
          <Button
            variant="outline"
            size="sm"
            icon={CloudDownload}
            onClick={doRestore}
            disabled={!driveReady || backingUp || restoring}
          >
            {restoring ? <><Spinner /> Restoring…</> : "Restore"}
          </Button>
        </Row>

        {!driveReady && (
          <div
            style={{
              marginTop: "var(--space-2)",
              padding: "var(--space-3)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-bg-muted)",
              border: "1px solid var(--color-border)",
              font: "var(--text-caption)",
              color: "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <HardDriveDownload size={14} />
            Google Drive backup isn&apos;t configured yet. Add a Google OAuth Client ID to enable it.
          </div>
        )}
      </div>
      )}

      {/* ===== Notifications (disabled) ===== */}
      {tab === "notifications" && (
      <div className="jx-card" style={{ position: "relative" }}>
        <div className="jx-card__title">
          Notifications <Badge variant="neutral">Coming soon</Badge>
        </div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Choose what you want to hear about.</div>
        {[
          ["Session reminders", "A nudge to log trades when each market session opens"],
          ["Trade fill alerts", "Notify when an order fills"],
          ["Daily summary email", "A recap of your day at market close"],
          ["Weekly performance recap", "Your stats every Monday"],
        ].map(([t, s]) => (
          <Row key={t} title={t} sub={s} disabled>
            <Switch on={false} onChange={() => {}} disabled />
          </Row>
        ))}
      </div>

      )}

      {/* ===== Appearance ===== */}
      {tab === "appearance" && (
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

      )}

      {/* ===== Connected exchanges (read-only API key) ===== */}
      {tab === "integrations" && (
      <div className="jx-card">
        <div className="jx-card__title">Connected exchanges &amp; brokers</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>
          Open the platform&apos;s API page, create a <strong>read-only</strong> key, and connect. Binance auto-imports today; others guide you to export &amp; import via CSV.
        </div>

        {PLATFORMS.map((p) => {
          const connected = p.id === "binance" && binanceConnected;
          const apiPage = p.apiPage;
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
                <>
                  {apiPage && (
                    <a href={apiPage} target="_blank" rel="noopener noreferrer" className="jx-btn jx-btn--ghost jx-btn--sm" style={{ textDecoration: "none" }}>
                      <ExternalLink size={14} /> API page
                    </a>
                  )}
                  <Button variant={p.live ? "primary" : "outline"} size="sm" onClick={() => setConnectPlatform(p.id)}>
                    Connect
                  </Button>
                </>
              )}
            </Row>
          );
        })}

        <Row title="Auto-import" sub="Pull new trades every 30 minutes in the background">
          <Switch on={autoSync} onChange={toggleAutoSync} disabled={!binanceConnected} />
        </Row>
      </div>


      )}

      {/* ===== Danger zone ===== */}
      {tab === "danger" && (
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
      )}
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
