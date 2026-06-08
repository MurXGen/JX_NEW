"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ImagePlus,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

import Badge from "./Badge";
import Button from "./Button";
import Card from "./Card";
import ChoiceChips from "./ChoiceChips";

const REASON_OPTIONS = [
  "Breakout",
  "Reversal",
  "Trend follow",
  "Support / Resistance",
  "News",
  "Scalp",
  "Swing",
  "FOMO",
];

const EMPTY_FORM = {
  symbol: "",
  direction: "long",
  status: "closed",
  quantity: "",
  leverage: "",
  entries: [{ price: "", allocation: "100" }],
  exits: [{ price: "", allocation: "100" }],
  stopLoss: "",
  takeProfit: "",
  fee: "",
  openTime: "",
  closeTime: "",
  reasons: [],
  notes: "",
  images: [],
};

function Field({ label, hint, error, children }) {
  return (
    <div className="jx-field">
      {label && <label className="jx-field__label">{label}</label>}
      {children}
      {(error || hint) && (
        <span className={`jx-field__hint ${error ? "jx-field__hint--error" : ""}`}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

function PriceRows({ label, rows, onChange, addLabel }) {
  const update = (i, key, val) => {
    const next = rows.map((r, idx) => (idx === i ? { ...r, [key]: val } : r));
    onChange(next);
  };

  return (
    <Field label={label} hint="Allocation = % of position at this price">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", gap: "var(--space-2)" }}>
            <div className="jx-input" style={{ flex: 2 }}>
              <input
                type="number"
                step="any"
                placeholder="Price"
                value={row.price}
                onChange={(e) => update(i, "price", e.target.value)}
              />
            </div>
            <div className="jx-input" style={{ flex: 1, minWidth: 90 }}>
              <input
                type="number"
                placeholder="100"
                value={row.allocation}
                onChange={(e) => update(i, "allocation", e.target.value)}
              />
              <span className="jx-input__addon">%</span>
            </div>
            {rows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
                aria-label="Remove row"
              >
                <Trash2 size={16} />
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={Plus}
          onClick={() => onChange([...rows, { price: "", allocation: "" }])}
          style={{ alignSelf: "flex-start" }}
        >
          {addLabel}
        </Button>
      </div>
    </Field>
  );
}

const weightedAvg = (rows) => {
  const valid = rows.filter((r) => Number(r.price) > 0);
  if (!valid.length) return 0;
  const totalAlloc = valid.reduce((s, r) => s + (Number(r.allocation) || 0), 0);
  if (!totalAlloc) {
    return valid.reduce((s, r) => s + Number(r.price), 0) / valid.length;
  }
  return (
    valid.reduce(
      (s, r) => s + Number(r.price) * (Number(r.allocation) || 0),
      0,
    ) / totalAlloc
  );
};

/**
 * revampV2 TradeLogForm — Figma design-system form components.
 * DUMMY for now: onSubmit just logs the payload + shows a toast.
 * Later: wire to POST /api/trades (multipart for images → Backblaze).
 */
export default function TradeLogForm({ onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  /* live estimated P&L */
  const estPnl = useMemo(() => {
    const avgEntry = weightedAvg(form.entries);
    const avgExit = weightedAvg(form.exits);
    const qty = Number(form.quantity) || 0;
    if (!avgEntry || !avgExit || !qty) return null;
    const dir = form.direction === "long" ? 1 : -1;
    return (avgExit - avgEntry) * qty * dir - (Number(form.fee) || 0);
  }, [form]);

  const validate = () => {
    const e = {};
    if (!form.symbol.trim()) e.symbol = "Symbol is required";
    if (!Number(form.quantity)) e.quantity = "Quantity is required";
    if (!form.entries.some((r) => Number(r.price) > 0))
      e.entries = "At least one entry price";
    if (
      form.status === "closed" &&
      !form.exits.some((r) => Number(r.price) > 0)
    )
      e.exits = "At least one exit price for a closed trade";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const payload = { ...form, estPnl };
    // DUMMY: replace with API call when we connect log-trade logic
    console.log("[TradeLogForm] payload:", payload);
    onSubmit?.(payload);

    setToast("Trade saved (sample only — not stored yet)");
    setTimeout(() => setToast(null), 3500);
    setForm(EMPTY_FORM);
  };

  const addImages = (files) => {
    const imgs = Array.from(files || [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 4 - form.images.length)
      .map((f) => ({ name: f.name, url: URL.createObjectURL(f), file: f }));
    if (imgs.length) set("images", [...form.images, ...imgs]);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
    >
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="jx-toast jx-toast--success"
          >
            <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Trade details ---- */}
      <Card title="Trade details">
        <div className="jx-form-grid">
          <Field label="Symbol" error={errors.symbol}>
            <div className={`jx-input ${errors.symbol ? "jx-input--error" : ""}`}>
              <span className="jx-input__icon">
                <Search size={16} />
              </span>
              <input
                placeholder="e.g. BTCUSDT"
                value={form.symbol}
                onChange={(e) => set("symbol", e.target.value.toUpperCase())}
              />
            </div>
          </Field>

          <Field label="Direction">
            <div className="jx-direction">
              <button
                type="button"
                className={`jx-direction__btn jx-direction__btn--long ${
                  form.direction === "long" ? "jx-direction__btn--active" : ""
                }`}
                onClick={() => set("direction", "long")}
              >
                <TrendingUp size={16} /> Buy / Long
              </button>
              <button
                type="button"
                className={`jx-direction__btn jx-direction__btn--short ${
                  form.direction === "short" ? "jx-direction__btn--active" : ""
                }`}
                onClick={() => set("direction", "short")}
              >
                <TrendingDown size={16} /> Sell / Short
              </button>
            </div>
          </Field>

          <Field label="Quantity" error={errors.quantity}>
            <div className={`jx-input ${errors.quantity ? "jx-input--error" : ""}`}>
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
              />
            </div>
          </Field>

          <Field label="Leverage" hint="Optional">
            <div className="jx-input">
              <input
                type="number"
                step="any"
                placeholder="1"
                value={form.leverage}
                onChange={(e) => set("leverage", e.target.value)}
              />
              <span className="jx-input__addon">×</span>
            </div>
          </Field>
        </div>
      </Card>

      {/* ---- Execution ---- */}
      <Card title="Execution">
        <div className="jx-form-grid" style={{ alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <PriceRows
              label="Entries"
              rows={form.entries}
              onChange={(rows) => set("entries", rows)}
              addLabel="Add entry"
            />
            {errors.entries && (
              <span className="jx-field__hint jx-field__hint--error">
                {errors.entries}
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <PriceRows
              label="Exits"
              rows={form.exits}
              onChange={(rows) => set("exits", rows)}
              addLabel="Add exit"
            />
            {errors.exits && (
              <span className="jx-field__hint jx-field__hint--error">
                {errors.exits}
              </span>
            )}
          </div>
        </div>

        <div className="jx-form-grid" style={{ marginTop: "var(--space-4)" }}>
          <Field label="Stop loss">
            <div className="jx-input">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={form.stopLoss}
                onChange={(e) => set("stopLoss", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Take profit">
            <div className="jx-input">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={form.takeProfit}
                onChange={(e) => set("takeProfit", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Fees">
            <div className="jx-input">
              <input
                type="number"
                step="any"
                placeholder="0.00"
                value={form.fee}
                onChange={(e) => set("fee", e.target.value)}
              />
            </div>
          </Field>
        </div>
      </Card>

      {/* ---- Timing ---- */}
      <Card title="Timing">
        <div className="jx-form-grid">
          <Field label="Open time">
            <div className="jx-input">
              <input
                type="datetime-local"
                value={form.openTime}
                onChange={(e) => set("openTime", e.target.value)}
              />
            </div>
          </Field>
          <Field label="Close time" hint="Leave empty for an open position">
            <div className="jx-input">
              <input
                type="datetime-local"
                value={form.closeTime}
                onChange={(e) => set("closeTime", e.target.value)}
              />
            </div>
          </Field>
        </div>
      </Card>

      {/* ---- Context ---- */}
      <Card title="Reasons & notes">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Field label="Why did you take this trade?">
            <ChoiceChips
              options={REASON_OPTIONS}
              value={form.reasons}
              onChange={(v) => set("reasons", v)}
            />
          </Field>

          <Field label="Notes / learnings">
            <textarea
              className="jx-textarea"
              placeholder="What did you see? What would you do differently?"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          <Field label="Screenshots" hint="Up to 4 images — stored on submit later (Backblaze)">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => addImages(e.target.files)}
            />
            <div
              className="jx-dropzone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addImages(e.dataTransfer.files);
              }}
            >
              <ImagePlus size={22} />
              <span>Click or drop chart screenshots here</span>
            </div>
            {form.images.length > 0 && (
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: "var(--space-2)" }}>
                {form.images.map((img, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.name}
                      style={{
                        width: 88,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set("images", form.images.filter((_, idx) => idx !== i))
                      }
                      aria-label="Remove image"
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "none",
                        cursor: "pointer",
                        background: "var(--color-danger)",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>
      </Card>

      {/* ---- Summary + actions ---- */}
      <Card flat>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Badge
              variant={form.direction === "long" ? "success" : "danger"}
              icon={form.direction === "long" ? TrendingUp : TrendingDown}
            >
              {form.direction === "long" ? "Buy / Long" : "Sell / Short"}
            </Badge>
            <span style={{ font: "var(--text-body-md)", color: "var(--color-text-muted)" }}>
              Est. P&L:{" "}
              <strong
                style={{
                  color:
                    estPnl == null
                      ? "var(--color-text-muted)"
                      : estPnl >= 0
                        ? "var(--color-success)"
                        : "var(--color-danger)",
                }}
              >
                {estPnl == null
                  ? "—"
                  : `${estPnl >= 0 ? "+" : "−"}${Math.abs(estPnl).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
              </strong>
            </span>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(EMPTY_FORM);
                setErrors({});
              }}
            >
              Reset
            </Button>
            <Button type="submit" variant="primary">
              Save trade
            </Button>
          </div>
        </div>
      </Card>
    </form>
  );
}
