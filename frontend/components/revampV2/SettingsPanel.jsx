"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { CloudUpload, CloudDownload, HardDriveDownload, LogOut, Upload, X, Gift, Copy, Check, Share2, Mail, Send, MessageCircle, Twitter, ExternalLink, User, CreditCard, SlidersHorizontal, Bell, Palette, Plug, ShieldAlert, ChevronRight, ChevronLeft, BookOpen, ArrowUpDown, LifeBuoy, Crown, Wallet, Calculator, Camera, Lock } from "lucide-react";

/* Settings sections, rendered as a left nav, one section at a time */
const SETTINGS_TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "billing", label: "Plan & billing", icon: CreditCard },
  { id: "preferences", label: "Trading preferences", icon: SlidersHorizontal },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "backup", label: "Backup & restore", icon: CloudUpload },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "refer", label: "Refer a friend", icon: Gift },
];
import Badge from "./Badge";
import Button from "./Button";
import Dropdown from "./Dropdown";
import Toast from "./Toast";
import ExchangeConnectModal, { PLATFORMS } from "./ExchangeConnectModal";
import ExchangeSyncModal from "./ExchangeSyncModal";
import PlanLimitsCard from "./PlanLimitsCard";
import { useTheme } from "./Sidebar";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
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

/* one tappable row in the mobile Settings hub: icon tile, label (+ sub),
   current value on the right, chevron */
function MRow({ icon: Icon, label, sub, value, hint, gold, onClick, disabled }) {
  return (
    <button type="button" className="jx-ms__row" onClick={onClick} disabled={disabled}>
      <span className={`jx-ms__ico ${gold ? "is-gold" : ""}`} aria-hidden="true"><Icon size={17} /></span>
      <span className="jx-ms__txt">
        <b>{label}</b>
        {sub && <small>{sub}</small>}
      </span>
      {value && <span className="jx-ms__val">{value}</span>}
      {hint && <span className="jx-ms__hint">{hint}</span>}
      <ChevronRight size={16} className="jx-ms__chev" aria-hidden="true" />
    </button>
  );
}

/* Refer a friend, shares the /refer landing link via native share + fallbacks */
function ReferAFriend({ userId }) {
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState("");
  const message =
    "I'm using JournalX to journal my trades and find my edge, start free, no card:";

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
    <div className="jx-card jx-sub">
      <div className="jx-sub__hero">
        <span className="jx-sub__heroIco is-gold" aria-hidden="true"><Gift size={20} /></span>
        <div>
          <h3>Invite a trader to JournalX</h3>
          <p>They start free with no card. Share your personal link below.</p>
        </div>
      </div>

      <ol className="jx-sub__steps">
        <li><b>1</b><span>Share your link</span></li>
        <li><b>2</b><span>They sign up free</span></li>
        <li><b>3</b><span>They start journaling</span></li>
      </ol>

      <div className="jx-sub__field">
        <span className="jx-sub__lbl" id="jx-ref-lbl">Your referral link</span>
        <div className="jx-sub__link">
          <input value={link} readOnly onFocus={(e) => e.target.select()} aria-labelledby="jx-ref-lbl" />
          <button type="button" className={`jx-sub__copy ${copied ? "is-done" : ""}`} onClick={copy}>
            {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {canNativeShare && (
        <button type="button" className="jx-btn jx-btn--primary jx-sub__wide" onClick={nativeShare}>
          <Share2 size={15} aria-hidden="true" /> Share invite
        </button>
      )}

      <div className="jx-sub__field">
        <span className="jx-sub__lbl">Or send it on</span>
        <div className="jx-sub__shares">
          {shareLinks.map((x) => (
            <a key={x.label} href={x.href} target="_blank" rel="noopener noreferrer">
              <x.icon size={16} aria-hidden="true" /> {x.label}
              <span className="jx-sr">(opens in a new tab)</span>
            </a>
          ))}
        </div>
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
  // photo when set, otherwise a glossy tile with a person icon (never initials)
  return url ? (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img className="jx-avatar" src={url} alt={name || "avatar"} style={{ width: size, height: size, objectFit: "cover" }} />
  ) : (
    <span className="jx-avatar jx-avatar--empty" role="img" aria-label={name ? `${name}, no photo` : "No photo"} style={{ width: size, height: size }}>
      <User size={Math.round(size * 0.42)} aria-hidden="true" />
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
      setError("Upload failed, try again");
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
            className="jx-ltmodal jx-ltmodal--narrow jx-ltmodal--popup"
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
                PNG or JPG · up to 2MB
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

/* Secondary app destinations surfaced inside the mobile Settings hub (on
   desktop these live in the left sidebar, so they're mobile-only here). */
const MORE_LINKS = [
  { id: "tools", label: "Trading calculators", icon: Calculator },
  { id: "blogs", label: "Learn & Focus", icon: BookOpen },
  { id: "share", label: "Share logs", icon: Share2 },
  { id: "importexport", label: "Import / Export", icon: ArrowUpDown },
];

/* Quick controls shown at the very top of Settings (above profile): switch the
   active journal, and flip the theme. */
function TopControls({ journalName, onSwitchJournal, theme, toggleTheme }) {
  return (
    <div className="jx-settings__quick">
      <button type="button" className="jx-settings__quickrow" onClick={() => onSwitchJournal?.()} disabled={!onSwitchJournal}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Wallet size={18} style={{ color: "var(--yellow-500)", flexShrink: 0 }} />
          <span style={{ display: "flex", flexDirection: "column", minWidth: 0, textAlign: "left" }}>
            <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>Active journal</span>
            <span className="jx-settings__mname" style={{ font: "var(--text-body-md)", fontWeight: 600 }}>{journalName || "Default journal"}</span>
          </span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--color-text-muted)", font: "var(--text-caption)", flexShrink: 0 }}>
          Switch <ChevronRight size={15} />
        </span>
      </button>

      <div className="jx-settings__quickrow" style={{ cursor: "default" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <Palette size={18} style={{ color: "var(--yellow-500)" }} />
          <span style={{ font: "var(--text-body-md)", fontWeight: 600 }}>Theme</span>
        </span>
        <div className="jx-seg jx-seg--inline">
          {["light", "dark"].map((t) => (
            <button key={t} type="button" className={`jx-seg__btn ${theme === t ? "jx-seg__btn--active" : ""}`} onClick={() => theme !== t && toggleTheme()}>
              {t === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
export default function SettingsPanel({ user, onNavigate, onSupport, onSwitchJournal }) {
  const { theme, toggleTheme } = useTheme();

  /* responsive: mobile shows a list → full-screen section drill-in */
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSection, setMobileSection] = useState(null); // null = list
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 760px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  // when drilling into (or out of) a mobile section, bring it to the top of the
  // screen so it's centred in view rather than mid-scroll
  useEffect(() => {
    if (typeof document === "undefined") return;
    // modal mode scrolls the dialog body; page mode scrolls the dashboard main
    const target =
      document.querySelector(".jx-settings-modal__body") ||
      document.querySelector(".jx-shell__main");
    if (target) target.scrollTo({ top: 0, behavior: "auto" });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }, [mobileSection]);

  /* ---- URL param sync for mobile drill-in ----
     Opening a section pushes ?settings=<id> so the phone/browser Back button
     (and the on-screen back arrow) return to the param-free settings list. */
  const openMobileSection = (id) => {
    setMobileSection(id);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("settings", id);
      window.history.pushState({ jxSettings: id }, "", url.toString());
    }
  };
  const closeMobileSection = () => {
    // go back so the ?settings param is removed from history, not just hidden
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("settings")) {
      window.history.back();
    } else {
      setMobileSection(null);
    }
  };
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    // initialise from the URL (supports deep-links / refreshes on a section)
    const initial = new URLSearchParams(window.location.search).get("settings");
    if (initial) setMobileSection(initial);
    const onPop = () => {
      const s = new URLSearchParams(window.location.search).get("settings");
      setMobileSection(s || null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* subscription (for the mobile header status) */
  const [sub, setSub] = useState(null);
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
  /* live exchange sync (Binance / Bybit) */
  const [exchStatus, setExchStatus] = useState({ pro: false, exchanges: {} });
  const [syncModal, setSyncModal] = useState(null); // 'binance' | 'bybit' | null
  const loadExchangeStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/integrations/exchange/status`, { withCredentials: true });
      setExchStatus(res.data || { pro: false, exchanges: {} });
    } catch { /* not signed in / offline — leave defaults */ }
  };
  useEffect(() => { loadExchangeStatus(); }, []);

  /* backup & restore (Google Drive) */
  const driveReady = isDriveConfigured();
  const [lastBackup, setLastBackup] = useState(null);
  const [lastRestore, setLastRestore] = useState(null);
  const [backingUp, setBackingUp] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const loadSub = async () => {
      try {
        const ud = await getFromIndexedDB("user-data");
        setSub(ud?.subscription || user?.subscription || null);
      } catch { setSub(user?.subscription || null); }
    };
    loadSub();
    window.addEventListener("jx-sub-changed", loadSub);
    return () => window.removeEventListener("jx-sub-changed", loadSub);
  }, [user]);

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
          : e.message || "Backup failed, try again",
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
      flash("success", "Data restored from Drive, reloading…");
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
              : e.message || "Restore failed, try again",
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
    flash("success", "Default journal set, new trades log here");
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

  /* on mobile the section is driven by the drill-in state; on desktop by the nav */
  const active = isMobile ? mobileSection : tab;

  /* plan/subscription summary for the mobile header */
  const planRaw = (sub?.plan || "free").toLowerCase();
  const subActive = sub?.status === "active";
  const planName = subActive && planRaw.includes("lifetime") ? "Lifetime"
    : subActive && planRaw.includes("pro") ? "Pro"
    : "Free";
  const isTop = subActive && (planRaw.includes("pro") || planRaw.includes("lifetime"));
  const sectionLabel = SETTINGS_TABS.find((t) => t.id === active)?.label || "Settings";

  /* active journal name for the quick "switch journal" control */
  const activeJournalName = (() => {
    const id = defaultJournal || (typeof window !== "undefined" ? Cookies.get("accountId") : "");
    const a = accounts.find((x) => x._id === id) || accounts[0];
    return a?.name || "";
  })();

  /* mobile rows exclude Profile (it already has its own card up top) */
  const mobileRows = visibleTabs.filter((t) => t.id !== "profile");

  return (
    <div className={`jx-settings ${isMobile ? "jx-settings--mobile" : ""}`}>
      <Toast toast={toast} />

      {/* desktop: left nav */}
      {!isMobile && (
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
      )}

      {/* mobile: grouped hub, each row shows its current value */}
      {isMobile && !mobileSection && (() => {
        const connectedN = Object.values(exchStatus.exchanges || {}).filter((x) => x?.connected).length;
        const more = Object.fromEntries(MORE_LINKS.map((m) => [m.id, m]));
        const go = (id) => onNavigate?.(id);
        return (
        <div className="jx-ms">
          <h1 className="jx-ms__title">Settings</h1>

          <button type="button" className="jx-ms__profile" onClick={() => openMobileSection("profile")}>
            <Avatar url={avatarUrl} name={name} size={52} />
            <span className="jx-ms__who">
              <b>{name || "Your name"}</b>
              <small>{user?.email || ""}</small>
              <span className={`jx-ms__plan ${isTop ? "is-top" : ""}`}>
                {isTop && <Crown size={11} aria-hidden="true" />} {planName}{subActive ? " · Active" : ""}
              </span>
            </span>
            <ChevronRight size={18} className="jx-ms__chev" aria-hidden="true" />
          </button>

          <section className="jx-ms__sec" aria-labelledby="jx-ms-journal">
            <h2 id="jx-ms-journal">Journal</h2>
            <div className="jx-ms__group">
              <MRow icon={Wallet} label={activeJournalName || "Default journal"} sub="Active journal" onClick={onSwitchJournal} hint="Switch" disabled={!onSwitchJournal} />
              <MRow icon={SlidersHorizontal} label="Trading preferences" value={baseCurrency} sub="Display currency, default journal, target" onClick={() => openMobileSection("preferences")} />
              {onNavigate && <MRow icon={ArrowUpDown} label={more.importexport.label} sub="CSV in, CSV or JSON out" onClick={() => go("importexport")} />}
              {onNavigate && <MRow icon={Share2} label={more.share.label} sub="A read-only link to your results" onClick={() => go("share")} />}
            </div>
          </section>

          <section className="jx-ms__sec" aria-labelledby="jx-ms-account">
            <h2 id="jx-ms-account">Account</h2>
            <div className="jx-ms__group">
              <MRow icon={CreditCard} label="Plan & billing" value={`${planName}${subActive ? "" : " plan"}`} gold={isTop} onClick={() => openMobileSection("billing")} />
              <MRow icon={Plug} label="Integrations" value={connectedN ? `${connectedN} connected` : exchStatus.pro ? "Not connected" : "Pro"} onClick={() => openMobileSection("integrations")} />
              {driveReady && <MRow icon={CloudUpload} label="Backup & restore" value={lastBackup ? "Backed up" : "Never"} onClick={() => openMobileSection("backup")} />}
              <MRow icon={Bell} label="Notifications" value="Soon" onClick={() => openMobileSection("notifications")} />
            </div>
          </section>

          <section className="jx-ms__sec" aria-labelledby="jx-ms-look">
            <h2 id="jx-ms-look">Appearance</h2>
            <div className="jx-ms__group">
              <div className="jx-ms__row is-static">
                <span className="jx-ms__ico" aria-hidden="true"><Palette size={17} /></span>
                <span className="jx-ms__txt"><b id="jx-ms-theme">Theme</b></span>
                <div className="jx-ms__seg" role="radiogroup" aria-labelledby="jx-ms-theme">
                  {["light", "dark"].map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={theme === t} onClick={() => theme !== t && toggleTheme()}>
                      {t === "light" ? "Light" : "Dark"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {onNavigate && (
            <section className="jx-ms__sec" aria-labelledby="jx-ms-tools">
              <h2 id="jx-ms-tools">Tools &amp; learning</h2>
              <div className="jx-ms__group">
                <MRow icon={Calculator} label={more.tools.label} sub="Position size, R-multiple, P&L" onClick={() => go("tools")} />
                <MRow icon={BookOpen} label={more.blogs.label} sub="Articles and focus games" onClick={() => go("blogs")} />
              </div>
            </section>
          )}

          <section className="jx-ms__sec" aria-labelledby="jx-ms-help">
            <h2 id="jx-ms-help">Help</h2>
            <div className="jx-ms__group">
              {onSupport && <MRow icon={LifeBuoy} label="Support & feedback" onClick={() => onSupport()} />}
              <MRow icon={Gift} label="Refer a friend" onClick={() => openMobileSection("refer")} />
            </div>
          </section>

          <button type="button" className="jx-ms__logout" onClick={logout}>
            <LogOut size={17} aria-hidden="true" /> Log out
          </button>
        </div>
        );
      })()}

      {/* desktop content, or mobile drilled-in section (full screen) */}
      {(!isMobile || mobileSection) && (
      <div className="jx-settings__content">
      {isMobile && mobileSection && (
        <div className="jx-settings__mhead">
          <button type="button" className="jx-settings__mback" onClick={closeMobileSection} aria-label="Back to settings">
            <ChevronLeft size={20} />
          </button>
          <span className="jx-settings__mtitle">{sectionLabel}</span>
        </div>
      )}
      {/* desktop quick controls (switch journal + theme) above profile */}
      {!isMobile && active === "profile" && (
        <TopControls journalName={activeJournalName} onSwitchJournal={onSwitchJournal} theme={theme} toggleTheme={toggleTheme} />
      )}
      {/* ===== Profile ===== */}
      {active === "profile" && (
      <div className="jx-card jx-pf">
        {/* identity: the avatar is the photo control, no separate photo row */}
        <div className="jx-pf__hero">
          <button type="button" className="jx-pf__avatar" onClick={() => setShowAvatar(true)} aria-label="Change profile photo">
            <Avatar url={avatarUrl} name={name} size={72} />
            <span className="jx-pf__cam" aria-hidden="true"><Camera size={13} /></span>
          </button>
          <div className="jx-pf__who">
            <b>{name || "Your name"}</b>
            <small>{user?.email || ""}</small>
            <span className={`jx-pf__plan ${isTop ? "is-top" : ""}`}>
              {isTop && <Crown size={11} aria-hidden="true" />} {planName} plan{subActive ? " · Active" : ""}
            </span>
          </div>
          {!isMobile && (
            <button type="button" className="jx-btn jx-btn--outline jx-btn--sm jx-logout" onClick={logout}>
              <LogOut size={15} /> Log out
            </button>
          )}
        </div>
        <button type="button" className="jx-pf__photo" onClick={() => setShowAvatar(true)}>
          <Upload size={14} aria-hidden="true" /> {avatarUrl ? "Change photo" : "Add a photo"}
          <small>PNG or JPG, up to 2MB</small>
        </button>

        <form
          className="jx-pf__form"
          onSubmit={(e) => { e.preventDefault(); if (profileDirty && !savingProfile) saveProfile(); }}
        >
          <label className="jx-pf__field">
            <span className="jx-pf__lbl">Display name <i aria-hidden="true">*</i><span className="jx-sr">(required)</span></span>
            <span className="jx-pf__input">
              <User size={15} aria-hidden="true" />
              <input value={name} placeholder="Your name" maxLength={60} required onChange={(e) => setName(e.target.value)} />
            </span>
            <span className="jx-pf__help">Shown on your shared reports</span>
          </label>

          <label className="jx-pf__field">
            <span className="jx-pf__lbl">Email</span>
            <span className="jx-pf__input is-locked">
              <Mail size={15} aria-hidden="true" />
              <input value={user?.email || ""} disabled readOnly />
              <Lock size={14} aria-hidden="true" />
            </span>
            <span className="jx-pf__help">Your login email can't be changed</span>
          </label>

          <div className={`jx-pf__save ${profileDirty ? "is-dirty" : ""}`}>
            <span className="jx-pf__state" aria-live="polite">{profileDirty ? "Unsaved changes" : "All changes saved"}</span>
            {profileDirty && (
              <button type="button" className="jx-btn jx-btn--ghost" onClick={() => setName(initialName || "")} disabled={savingProfile}>
                Discard
              </button>
            )}
            <button type="submit" className="jx-btn jx-btn--primary" disabled={savingProfile || !profileDirty} style={{ minWidth: 130 }}>
              {savingProfile ? <><Spinner /> Saving…</> : "Save changes"}
            </button>
          </div>
        </form>
      </div>
      )}

      {/* ===== Refer a friend ===== */}
      {active === "refer" && <ReferAFriend userId={user?._id || user?.id} />}

      {/* ===== Plan & billing ===== */}
      {active === "billing" && <div className="jx-sub-wrap"><PlanLimitsCard /></div>}

      {/* ===== Trading preferences ===== */}
      {active === "preferences" && (
      <div className="jx-card jx-sub jx-prefs">
        <div className="jx-card__title jx-sub__dup">Trading preferences</div>
        <div className="jx-sub__hero">
          <span className="jx-sub__heroIco" aria-hidden="true"><SlidersHorizontal size={20} /></span>
          <div>
            <h3>Your trading defaults</h3>
            <p>Where new trades go, which currency you see, and the goal you're working towards.</p>
          </div>
        </div>

        <div className="jx-pf__field">
          <span className="jx-pf__lbl" id="jx-pref-journal">Default journal</span>
          <Dropdown
            value={defaultJournal}
            onChange={pickDefaultJournal}
            label="Your journals"
            placeholder="Pick a journal"
            options={accounts.map((a) => ({ value: a._id, label: a.name, hint: a.currency }))}
            triggerStyle={{ height: 46 }}
          />
          <span className="jx-pf__help">New trades are logged here</span>
        </div>

        <div className="jx-pf__field">
          <span className="jx-pf__lbl" id="jx-dispcur">Display currency</span>
          <div className="jx-curchips" role="radiogroup" aria-labelledby="jx-dispcur">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={baseCurrency === c}
                onClick={() => {
                  /* Display-only override (no DB). Dashboard converts journal→display
                     at view time; journal balances stay in their own currency. */
                  setBaseCurrency(c);
                  localStorage.setItem("jx-display-currency", c);
                  window.dispatchEvent(new CustomEvent("jx-currency-changed", { detail: c }));
                  flash("success", `Values now shown in ${c}`);
                }}
              >
                <b>{getCurrencySymbol(c)}</b> {c}
              </button>
            ))}
          </div>
          <span className="jx-pf__help">Applies instantly to the dashboard, Trades log, Markets and Share. Each journal still stores its own currency.</span>
        </div>

        <form
          className="jx-pf__field"
          onSubmit={(e) => {
            e.preventDefault();
            /* localStorage only, no DB */
            const v = Number(monthlyTarget);
            if (!v || v <= 0) return flash("danger", "Enter a positive target");
            try {
              localStorage.setItem("jx-monthly-target", String(v));
              window.dispatchEvent(new CustomEvent("jx-target-changed", { detail: v }));
              flash("success", `Monthly target set to ${v.toLocaleString()}, see the goal card`);
            } catch (err) {
              console.error(err);
              flash("danger", "Could not save locally");
            }
          }}
        >
          <label className="jx-pf__lbl" htmlFor="jx-pref-target">Monthly P&amp;L target</label>
          <div className="jx-pref__inline">
            <span className="jx-pf__input">
              <span className="jx-pref__sym" aria-hidden="true">{getCurrencySymbol(baseCurrency)}</span>
              <input
                id="jx-pref-target"
                type="number"
                inputMode="decimal"
                min="0"
                placeholder="e.g. 15000"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
              />
            </span>
            <button type="submit" className="jx-btn jx-btn--secondary">Set</button>
          </div>
          <span className="jx-pf__help">Tracked on the dashboard goal card</span>
        </form>

        <div className="jx-pf__field">
          <span className="jx-pf__lbl">Coming soon</span>
          <ul className="jx-pref__soon">
            <li><span><b>Default risk per trade</b><small>Suggests a position size · 1.0%</small></span><em>Soon</em></li>
            <li><span><b>Position sizing model</b><small>How size is calculated · Fixed fractional</small></span><em>Soon</em></li>
          </ul>
        </div>
      </div>

      )}

      {/* ===== Backup & restore (Google Drive) ===== */}
      {active === "backup" && driveReady && (
      <div className="jx-card jx-sub jx-int">
        <div className="jx-card__title jx-sub__dup">Backup &amp; restore</div>
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
      {active === "notifications" && (
      <div className="jx-card jx-sub jx-int" style={{ position: "relative" }}>
        <div className="jx-card__title jx-sub__dup">
          Notifications <Badge variant="neutral">Coming soon</Badge>
        </div>
        <div className="jx-sub__soon">
          <Bell size={16} aria-hidden="true" />
          <span><b>Coming soon.</b> Pick what you want to hear about; these switch on when alerts launch.</span>
        </div>
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

      {/* ===== Connected exchanges (read-only API key) ===== */}
      {active === "integrations" && (
      <div className="jx-card jx-sub jx-int">
        <div className="jx-card__title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          Connected exchanges &amp; brokers
          {!exchStatus.pro && <Badge variant="brand"><Crown size={11} /> Pro</Badge>}
        </div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>
          {exchStatus.pro
            ? <>Connect Binance or Bybit with a <strong>read-only</strong> API key to auto-import your trades. Others are coming soon — for now use CSV from <strong>Import / Export</strong>.</>
            : <>Live exchange sync is a <strong>Pro</strong> feature. Upgrade to auto-import from Binance &amp; Bybit. You can still bring trades in via CSV from <strong>Import / Export</strong>.</>}
        </div>

        <div className="jx-int__group">Crypto exchanges · live</div>
        {/* Live: Binance & Bybit */}
        {["binance", "bybit"].map((id) => {
          const st = exchStatus.exchanges?.[id] || {};
          const name = id === "binance" ? "Binance" : "Bybit";
          return (
            <Row
              key={id}
              title={name}
              sub={st.connected
                ? `Connected · ••••${st.keyHint || ""}${st.lastSyncAt ? ` · synced ${new Date(st.lastSyncAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}` : ""}`
                : "Read-only API key · auto-sync"}
            >
              {st.connected && <Badge variant="success">Connected</Badge>}
              <Button variant={st.connected ? "outline" : "primary"} size="sm" onClick={() => setSyncModal(id)}>
                {st.connected ? "Manage" : "Connect"}
              </Button>
            </Row>
          );
        })}

        {/* Forex & prop-firm platforms, in development */}
        <div className="jx-int__group">Forex &amp; prop-firm platforms</div>
        {PLATFORMS.filter((p) => p.kind === "prop").map((p) => (
          <Row key={p.id} title={p.name} sub={p.note}>
            <Badge variant="neutral">In development</Badge>
          </Row>
        ))}

        {/* Coming soon: everything else */}
        <div className="jx-int__group">More exchanges &amp; brokers · use CSV import for now</div>
        {PLATFORMS.filter((p) => !["binance", "bybit"].includes(p.id) && p.kind !== "prop").map((p) => (
          <Row key={p.id} title={p.name}>
            <Badge variant="neutral">Coming soon</Badge>
          </Row>
        ))}
      </div>
      )}

      {/* ===== Danger zone ===== */}
      {active === "danger" && (
      <div className="jx-card" style={{ borderColor: "var(--color-danger)" }}>
        <div className="jx-card__title" style={{ color: "var(--color-danger)" }}>Danger zone</div>
        <div className="jx-setrow__sub" style={{ marginBottom: "var(--space-2)" }}>Irreversible actions, proceed with care.</div>
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
      )}

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
      <ExchangeSyncModal
        open={!!syncModal}
        exchange={syncModal}
        status={syncModal ? exchStatus.exchanges?.[syncModal] : null}
        isPro={exchStatus.pro}
        onClose={() => setSyncModal(null)}
        onChanged={loadExchangeStatus}
      />
    </div>
  );
}
