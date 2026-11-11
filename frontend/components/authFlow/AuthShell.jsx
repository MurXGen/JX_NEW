"use client";

/* Shared shell + form primitives for the auth and first-run screens
   (login, register, forgot-password, create journal). Matches the dark
   marketing site: near-black canvas, silver type, gold primary action. */

import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info, Mail } from "lucide-react";
import s from "./Auth.module.css";

export { s as authStyles };

const AuthGlobe = dynamic(() => import("./AuthGlobe"), { ssr: false });

const STATS = [
  ["250,000+", "trades logged"],
  ["40+", "markets"],
  ["30s", "average setup"],
];

/* Desktop only: globe size from the viewport (null below 1100px, where the
   globe isn't loaded at all). */
function useGlobeSize() {
  const [size, setSize] = useState(null);
  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setSize(w >= 1100 ? Math.round(Math.min(860, Math.max(620, Math.min(w * 0.5, h * 0.95)))) : null);
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);
  return size;
}

/* half-visible globe, cut by the left edge of the screen */
function EdgeGlobe({ size }) {
  if (!size) return null;
  return (
    <div className={s.globeEdge} aria-hidden="true" style={{ width: size, height: size }}>
      <div className={s.globeGlow} />
      <AuthGlobe size={size} />
    </div>
  );
}

/* minimal copy beside the globe */
function WorldPanel() {
  return (
    <section className={s.world} aria-label="About JournalX">
      <div className={s.worldCopy}>
        <h2 className={s.worldTitle}>Every trade logged.<br /><span>Every pattern found.</span></h2>
        <p className={s.worldLead}>The trading journal for personal and funded accounts.</p>
        <dl className={s.stats}>
          {STATS.map(([v, l]) => (
            <div key={l}><dt>{l}</dt><dd>{v}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
}

/**
 * AuthShell: minimal top bar and a centered form column (Resend-style
 * restraint: black canvas, soft glow, quiet bordered surfaces).
 * - step: optional "Step 1 of 2" style tag
 * - switchLink: { prompt, label, href } shown top-right
 */
export function AuthShell({ title, subtitle, step, switchLink, children, icon: TileIcon }) {
  const reduce = useReducedMotion();
  const globeSize = useGlobeSize();

  return (
    <div className={s.shell} style={globeSize ? { "--gh": `${globeSize / 2}px` } : undefined}>
      <div className={s.glow} aria-hidden="true" />
      <div className={s.grid} aria-hidden="true" />
      <EdgeGlobe size={globeSize} />

      <header className={s.top}>
        <a href="/" className={s.logo} aria-label="JournalX home">
          Journal<em>X</em>
        </a>
        {switchLink && (
          <span className={s.topLink}>
            <span className={s.topPrompt}>{switchLink.prompt}</span>
            <a href={switchLink.href}>{switchLink.label}</a>
          </span>
        )}
      </header>

      <main className={s.body}>
        <WorldPanel />

        <motion.div
          className={s.card}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={title}
              className={s.head}
              initial={reduce ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
            >
              {TileIcon && <span className={s.tile} aria-hidden="true"><TileIcon size={22} strokeWidth={1.6} /></span>}
              {step && <span className={s.stepTag}>{step}</span>}
              <h1 className={s.title}>{title}</h1>
              {subtitle && <p className={s.subtitle}>{subtitle}</p>}
            </motion.div>
          </AnimatePresence>
          <div className={s.cardBody}>{children}</div>
        </motion.div>
      </main>

      <footer className={s.foot}>
        <span>© {new Date().getFullYear()} JournalX</span>
        <a href="/terms-services">Terms</a>
        <a href="/privacy-policy">Privacy</a>
        <a href="/contact">Support</a>
      </footer>
    </div>
  );
}

/* Animated swap between the steps inside one card. */
export function StepPane({ id, children, as = "div", ...rest }) {
  const reduce = useReducedMotion();
  const Comp = as === "form" ? motion.form : motion.div;
  return (
    <Comp
      key={id}
      className={s.stack}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 1 } : { opacity: 0, y: -8 }}
      transition={{ duration: reduce ? 0 : 0.2 }}
      {...rest}
    >
      {children}
    </Comp>
  );
}

/* Inline status message. Errors are announced assertively, others politely. */
export function Notice({ notice }) {
  // field-specific errors are shown inline under the field instead
  if (!notice || notice.field) return null;
  const Icon = notice.type === "danger" ? AlertCircle : notice.type === "success" ? CheckCircle2 : Info;
  return (
    <div
      className={s.notice}
      data-type={notice.type}
      role={notice.type === "danger" ? "alert" : "status"}
    >
      <Icon size={16} aria-hidden="true" />
      <span>{notice.msg}</span>
    </div>
  );
}

/* Notice state with the old flash(type, msg) signature + which field is at fault. */
export function useNotice() {
  const [notice, setNotice] = useState(null);
  const [errField, setErrField] = useState(null);
  const flash = (type, msg, field = null) => {
    const f = type === "danger" ? field : null;
    setNotice({ type, msg, field: f, at: Date.now() });
    setErrField(f);
  };
  const clear = () => { setNotice(null); setErrField(null); };
  /* message for an inline field error (null when that field isn't at fault) */
  const errorFor = (field) => (notice && notice.field === field ? notice.msg : null);
  return { notice, errField, errorFor, flash, clear, setErrField };
}

export function Field({ id, label, labelAside, hint, error, children }) {
  return (
    <div className={s.field}>
      <div className={s.labelRow}>
        <label htmlFor={id} className={s.label}>{label}</label>
        {labelAside}
      </div>
      {children}
      {hint && !error && <p id={`${id}-hint`} className={s.hint}>{hint}</p>}
      {error && (
        <p id={`${id}-error`} className={s.error} role="alert">
          <AlertCircle size={14} aria-hidden="true" />{error}
        </p>
      )}
    </div>
  );
}

export const TextInput = forwardRef(function TextInput({ icon: Icon, invalid, describedBy, after, ...props }, ref) {
  return (
    <div className={s.control} data-invalid={invalid ? "true" : undefined}>
      {Icon && <span className={s.icon} aria-hidden="true"><Icon size={16} /></span>}
      <input ref={ref} aria-invalid={invalid || undefined} aria-describedby={describedBy} {...props} />
      {after}
    </div>
  );
});

export function PasswordInput({ show, onToggle, ...props }) {
  return (
    <TextInput
      {...props}
      type={show ? "text" : "password"}
      after={
        <button
          type="button"
          className={s.iconBtn}
          onClick={onToggle}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      }
    />
  );
}

const DOMAINS = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "hotmail.com", "proton.me", "live.com", "aol.com"];

/* Email input with domain suggestions (accessible combobox). Arrow keys move
   through suggestions, Enter picks the highlighted one, Escape closes. With no
   suggestion highlighted, Enter behaves as normal (submits / onEnter). */
export function EmailInput({ id, value = "", onChange, onEnter, invalid, describedBy, autoFocus, placeholder = "you@example.com" }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef(null);
  const listId = `${id}-list`;

  const at = value.indexOf("@");
  const local = at === -1 ? value : value.slice(0, at);
  const domainPart = at === -1 ? null : value.slice(at + 1).toLowerCase();
  const suggestions = (() => {
    if (!local.trim()) return [];
    const doms = domainPart == null ? DOMAINS : DOMAINS.filter((d) => d.startsWith(domainPart));
    return doms.map((d) => `${local}@${d}`).filter((f) => f !== value).slice(0, 5);
  })();
  const show = open && suggestions.length > 0;

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => { setActive(-1); }, [value]);

  const pick = (v) => { onChange(v); setOpen(false); setActive(-1); };

  return (
    <div ref={wrapRef} className={s.suggestWrap}>
      <TextInput
        id={id}
        icon={Mail}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        invalid={invalid}
        describedBy={describedBy}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % suggestions.length);
          } else if (e.key === "ArrowUp" && suggestions.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a <= 0 ? suggestions.length - 1 : a - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          } else if (e.key === "Enter") {
            if (show && active >= 0) { e.preventDefault(); pick(suggestions[active]); }
            else if (onEnter) { e.preventDefault(); setOpen(false); onEnter(); }
            else setOpen(false);
          }
        }}
      />
      {show && (
        <ul id={listId} role="listbox" aria-label="Email suggestions" className={s.listbox} onMouseDown={(e) => e.preventDefault()}>
          {suggestions.map((sug, i) => (
            <li
              key={sug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={s.option}
              onClick={() => pick(sug)}
              onMouseEnter={() => setActive(i)}
            >
              <Mail size={13} aria-hidden="true" style={{ opacity: 0.55, flex: "none" }} />
              {sug}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* 6-box code entry. Auto-advance, backspace navigation, paste the full code. */
export function OtpCode({ value = "", onChange, length = 6, autoFocus = true, invalid, error, label = "Verification code", describedBy }) {
  const refs = useRef([]);
  const chars = [...Array(length)].map((_, i) => value[i] || "");
  const commit = (next) => onChange(next.join("").slice(0, length));

  const handleChange = (i, raw) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return;
    const next = [...chars];
    if (digits.length > 1) {
      for (let j = 0; j < digits.length && i + j < length; j++) next[i + j] = digits[j];
      commit(next);
      refs.current[Math.min(length - 1, i + digits.length)]?.focus();
    } else {
      next[i] = digits;
      commit(next);
      refs.current[i + 1]?.focus();
    }
  };

  const handleKey = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...chars];
      if (next[i]) { next[i] = ""; commit(next); }
      else if (i > 0) { next[i - 1] = ""; commit(next); refs.current[i - 1]?.focus(); }
    }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < length - 1) refs.current[i + 1]?.focus();
  };

  const errId = error ? "otp-error" : undefined;
  return (
    <div className={s.field}>
    <fieldset className={s.otp} data-invalid={invalid || error ? "true" : undefined} aria-describedby={errId || describedBy}>
      <legend className={s.srOnly}>{label}</legend>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className={s.otpBox}
          data-filled={c ? "true" : undefined}
          value={c}
          autoFocus={autoFocus && i === 0}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </fieldset>
    {error && (
      <p id={errId} className={s.error} role="alert" style={{ justifyContent: "center" }}>
        <AlertCircle size={14} aria-hidden="true" />{error}
      </p>
    )}
    </div>
  );
}

export function Spinner() {
  return <span className={s.spinner} aria-hidden="true" />;
}

export function Button({ variant = "gold", busy, busyLabel, children, className = "", ...props }) {
  const v = variant === "gold" ? s.btnGold : variant === "outline" ? s.btnOutline : s.btnText;
  return (
    <button type="button" className={`${s.btn} ${v} ${className}`} aria-busy={busy || undefined} {...props}>
      {busy ? (<><Spinner />{busyLabel || children}</>) : children}
    </button>
  );
}

export function Divider({ children = "or" }) {
  return <div className={s.divider} role="separator">{children}</div>;
}

export function GoogleButton({ href, label = "Continue with Google" }) {
  return (
    <Button variant="outline" onClick={() => { window.location.href = href; }}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.49 12c0-.73.13-1.44.35-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
      </svg>
      {label}
    </Button>
  );
}

/* Turnstile wrapper slot so the card doesn't jump while the widget loads. */
export function CaptchaSlot({ children }) {
  return <div className={s.captcha}>{children}</div>;
}

export function useFieldId(name) {
  const base = useId();
  return `${name}-${base.replace(/:/g, "")}`;
}
