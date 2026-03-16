// pages/add-trade.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Upload,
  X,
  Check,
  Camera,
  Brain,
  Target,
  Zap,
  Plus,
  Minus,
  Save,
} from "lucide-react";
import DateTimePicker from "@/components/ui/DateTimePicker";
import FullPageLoader from "@/components/ui/FullPageLoader";
import ToastMessage from "@/components/ui/ToastMessage";
import PlanLimitModal from "@/components/ui/PlanLimitModal";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import {
  canSubmitTrade,
  canUploadImageThisMonth,
} from "@/utils/TradeMonthCount";
import { useData } from "@/api/DataContext";

const TRADE_KEY = "__t_rd_iD";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Helper: Convert file to data URL
const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Helper: Convert data URL to File
const dataUrlToFile = (dataUrl, filename, mimeType) => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)[1] || mimeType;
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename || "image.png", { type: mime });
};

// Helper: Format price
const formatPrice = (num) => {
  if (!num && num !== 0) return "";
  if (num < 1) {
    return num.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  }
  return num.toFixed(2);
};

// Helper: Calculate price from percent
const calcPriceFromPercent = (avgEntryPrice, percent, direction = "long") => {
  const base = Number(avgEntryPrice);
  const pct = Number(percent);
  if (!base || !pct) return "";
  if (direction === "long") {
    return formatPrice(base * (1 + pct / 100));
  }
  return formatPrice(base * (1 - pct / 100));
};

// Helper: Get local datetime string
const getLocalDateTime = (date = new Date()) => {
  const pad = (n) => (n < 10 ? "0" + n : n);
  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes())
  );
};

// Helper: Normalize datetime
const normalizeDateTime = (value) => {
  if (!value) return null;
  if (!value.includes("T")) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const localDateTime = `${value}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    return new Date(localDateTime).toISOString();
  }
  return new Date(value).toISOString();
};

export default function AddTradePage() {
  const router = useRouter();
  const { userData, refreshData } = useData();
  const fileInputRef = useRef(null);

  // State
  const [form, setForm] = useState({
    symbol: "",
    direction: "long",
    quantityUSD: "",
    leverage: "1",
    totalQuantity: "",
    tradeStatus: "quick",
    entries: [{ price: "", allocation: "100" }],
    exits: [{ mode: "price", price: "", percent: "", allocation: "" }],
    tps: [{ mode: "price", price: "", percent: "", allocation: "" }],
    sls: [{ mode: "price", price: "", percent: "", allocation: "" }],
    rulesFollowed: false,
    reason: [],
    learnings: "",
    avgEntryPrice: "",
    avgExitPrice: "",
    avgSLPrice: "",
    avgTPPrice: "",
    openTime: getLocalDateTime(new Date()),
    closeTime: getLocalDateTime(new Date()),
    openImage: null,
    openImagePreview: "",
    closeImage: null,
    closeImagePreview: "",
    duration: 0,
    rr: "",
    pnl: "",
    expectedProfit: 0,
    expectedLoss: 0,
    fees: 0,
  });

  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(""); // "submitting", "success", "error"
  const [toast, setToast] = useState({ type: "", message: "" });
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [activeImageField, setActiveImageField] = useState(null);
  const [showOpenTimePicker, setShowOpenTimePicker] = useState(false);
  const [showCloseTimePicker, setShowCloseTimePicker] = useState(false);
  const [showReasonSelector, setShowReasonSelector] = useState(false);
  const [showLearnings, setShowLearnings] = useState(false);

  const isEdit = router.query.mode === "edit" || router.query.mode === "close";
  const tradeStatus = form.tradeStatus;

  // Reason options
  const reasonOptions = [
    "Trend Following",
    "Breakout",
    "Reversal",
    "Support/Resistance",
    "News Based",
    "Scalping",
    "Swing",
    "Positional",
    "Pattern Recognition",
    "Volume Spike",
  ];

  // Load currency
  useEffect(() => {
    const loadCurrency = async () => {
      const cachedUser = await getFromIndexedDB("user-data");
      const accountId = Cookies.get("accountId");
      const activeAccount = cachedUser?.accounts?.find(
        (acc) => acc._id === accountId,
      );
      if (activeAccount?.currency) {
        setCurrencySymbol(getCurrencySymbol(activeAccount.currency));
      }
    };
    loadCurrency();
  }, []);

  // Load trade data for edit
  useEffect(() => {
    if (!isEdit || !userData) return;

    const tradeId = localStorage.getItem(TRADE_KEY);
    if (!tradeId) return;

    const tradeData = userData.trades?.find((t) => t._id === tradeId);
    if (!tradeData) return;

    let parsedReason = [];
    if (Array.isArray(tradeData.reason)) {
      if (
        tradeData.reason.length === 1 &&
        typeof tradeData.reason[0] === "string"
      ) {
        try {
          parsedReason = JSON.parse(tradeData.reason[0]);
        } catch {
          parsedReason = tradeData.reason;
        }
      } else {
        parsedReason = tradeData.reason;
      }
    }

    setForm({
      ...form,
      ...tradeData,
      reason: parsedReason,
      openTime: tradeData.openTime
        ? getLocalDateTime(new Date(tradeData.openTime))
        : getLocalDateTime(),
      closeTime: tradeData.closeTime
        ? getLocalDateTime(new Date(tradeData.closeTime))
        : getLocalDateTime(),
      openImage: null,
      openImagePreview: tradeData.openImageUrl || "",
      closeImage: null,
      closeImagePreview: tradeData.closeImageUrl || "",
    });
  }, [isEdit, userData]);

  // Calculate averages and derived values
  useEffect(() => {
    const avgEntry = calcWeightedAverage(form.entries);
    const avgTP = calcWeightedAverage(form.tps, avgEntry, form.direction);
    const avgSL = calcWeightedAverage(form.sls, avgEntry, form.direction);
    const avgExit = calcWeightedAverage(form.exits, avgEntry, form.direction);

    let duration = 0;
    if (form.openTime && form.closeTime) {
      const start = new Date(form.openTime);
      const end = new Date(form.closeTime);
      duration = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    }

    let expectedProfit = 0;
    let expectedLoss = 0;

    if (avgEntry && avgTP) {
      const profitPercent = ((avgTP - avgEntry) / avgEntry) * 100;
      expectedProfit = ((profitPercent / 100) * form.quantityUSD).toFixed(2);
    }
    if (avgEntry && avgSL) {
      const lossPercent = ((avgEntry - avgSL) / avgEntry) * 100;
      expectedLoss = ((lossPercent / 100) * form.quantityUSD).toFixed(2);
    }

    let rr = "";
    if (expectedLoss && expectedProfit && expectedLoss !== "0") {
      const rawRR = expectedProfit / Math.abs(expectedLoss);
      rr = `1:${Number(rawRR.toFixed(2))}`;
    }

    let pnl = form.pnl;
    if (form.tradeStatus === "closed" && avgExit && avgEntry) {
      const pnlPercent =
        form.direction === "long"
          ? ((avgExit - avgEntry) / avgEntry) * 100
          : ((avgEntry - avgExit) / avgEntry) * 100;
      pnl = ((pnlPercent / 100) * form.quantityUSD).toFixed(2);
    }

    setForm((prev) => ({
      ...prev,
      avgEntryPrice: avgEntry,
      avgTPPrice: avgTP,
      avgSLPrice: avgSL,
      avgExitPrice: avgExit,
      duration,
      rr,
      pnl,
      expectedProfit,
      expectedLoss,
    }));
  }, [
    form.entries,
    form.tps,
    form.sls,
    form.exits,
    form.openTime,
    form.closeTime,
    form.quantityUSD,
    form.tradeStatus,
    form.direction,
  ]);

  // Calculate total quantity when quantity or leverage changes
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      totalQuantity:
        (Number(prev.quantityUSD) || 0) * (Number(prev.leverage) || 0),
    }));
  }, [form.quantityUSD, form.leverage]);

  // Weighted average calculator
  const calcWeightedAverage = (arr, avgEntryPrice, direction = "long") => {
    let totalAlloc = 0;
    let weighted = 0;

    arr.forEach((x) => {
      let price;
      if (x.mode === "percent" && x.percent !== "") {
        price = Number(
          calcPriceFromPercent(avgEntryPrice, x.percent, direction),
        );
      } else {
        price = Number(x.price);
      }
      const alloc = Number(x.allocation) || 0;
      if (!isNaN(price) && alloc > 0) {
        weighted += price * alloc;
        totalAlloc += alloc;
      }
    });

    return totalAlloc > 0 ? (weighted / totalAlloc).toFixed(2) : "";
  };

  // Handle allocation for entries
  const handleEntryAllocation = (idx, value) => {
    setForm((prev) => {
      let entries = [...prev.entries];
      let currentVal = Number(value);
      if (isNaN(currentVal) || currentVal <= 0) return prev;

      const usedOther = entries.reduce(
        (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
        0,
      );
      const remaining = Math.max(0, 100 - usedOther);
      if (currentVal > remaining) currentVal = remaining;

      entries[idx].allocation = currentVal;
      const totalAllocated = entries.reduce(
        (sum, e) => sum + Number(e.allocation || 0),
        0,
      );

      if (totalAllocated < 100 && idx === entries.length - 1) {
        entries.push({ price: "", allocation: "" });
      } else if (totalAllocated >= 100) {
        entries = entries.slice(0, idx + 1);
      }

      return { ...prev, entries };
    });
  };

  // Handle image selection
  const handleImageSelect = (field) => {
    setActiveImageField(field);
    fileInputRef.current?.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeImageField) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setToast({ type: "error", message: "Image size cannot exceed 5MB" });
      e.target.value = "";
      setActiveImageField(null);
      return;
    }

    const allowed = await canUploadImageThisMonth();
    if (!allowed) {
      setShowPlanModal(true);
      e.target.value = "";
      setActiveImageField(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      [activeImageField]: file,
      [`${activeImageField}Preview`]: previewUrl,
    }));

    fileToDataUrl(file).then((dataUrl) => {
      try {
        localStorage.setItem(
          `newTradeImage_${activeImageField}`,
          JSON.stringify({
            dataUrl,
            name: file.name,
            type: file.type,
            ts: Date.now(),
          }),
        );
      } catch {}
    });

    setActiveImageField(null);
    e.target.value = "";
  };

  const handleImageRemove = (field) => {
    setForm((prev) => ({
      ...prev,
      [field]: null,
      [`${field}Preview`]: "",
    }));
    localStorage.removeItem(`newTradeImage_${field}`);
  };

  // Validate form
  const validateForm = () => {
    if (!form.symbol.trim()) return "Symbol name is required";

    if (form.tradeStatus === "quick") {
      if (form.pnl === "" || form.pnl === null) return "PnL is required";
      if (!form.closeTime) return "Close time is required";
    } else {
      if (!form.entries[0]?.price) return "At least one entry is required";
      if (form.tradeStatus === "closed") {
        if (!form.exits[0]?.price) return "At least one exit is required";
        if (!form.closeTime) return "Close time is required";
      }
    }

    if (form.closeTime && form.openTime) {
      if (new Date(form.closeTime) < new Date(form.openTime)) {
        return "Close time cannot be earlier than open time";
      }
    }

    return null;
  };

  // Submit trade
  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    const tradeType = form.tradeStatus === "quick" ? "quick" : "normal";
    const allowed = await canSubmitTrade(tradeType);
    if (!allowed) {
      setShowPlanModal(true);
      return;
    }

    setLoading(true);
    setSubmitStatus("submitting");

    try {
      const accountId = Cookies.get("accountId");
      const formData = new FormData();

      if (accountId) {
        const parsed = Array.isArray(accountId)
          ? accountId[0]
          : typeof accountId === "string" && accountId.includes("[")
            ? JSON.parse(accountId)[0]
            : accountId;
        formData.append("accountId", parsed);
      }

      const normalizedForm = {
        ...form,
        openTime: normalizeDateTime(form.openTime),
        closeTime: normalizeDateTime(form.closeTime),
      };

      Object.entries(normalizedForm).forEach(([key, value]) => {
        if (key === "openImagePreview" || key === "closeImagePreview") return;
        if (Array.isArray(value) || typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });

      // Add images
      const openImagePayload = localStorage.getItem("newTradeImage_openImage");
      const closeImagePayload = localStorage.getItem(
        "newTradeImage_closeImage",
      );

      if (openImagePayload) {
        const { dataUrl, name, type } = JSON.parse(openImagePayload);
        formData.append("openImage", dataUrlToFile(dataUrl, name, type));
      }
      if (closeImagePayload) {
        const { dataUrl, name, type } = JSON.parse(closeImagePayload);
        formData.append("closeImage", dataUrlToFile(dataUrl, name, type));
      }

      let res;
      if (isEdit) {
        const tradeId = localStorage.getItem(TRADE_KEY);
        res = await axios.put(
          `${API_BASE}/api/trades/update/${tradeId}`,
          formData,
          {
            withCredentials: true,
          },
        );
      } else {
        res = await axios.post(`${API_BASE}/api/trades/add`, formData, {
          withCredentials: true,
        });
      }

      if (res.data?.success) {
        setSubmitStatus("success");
        setToast({
          type: "success",
          message:
            res.data.message || (isEdit ? "Trade updated!" : "Trade added!"),
        });

        // Update IndexedDB
        const userData = (await getFromIndexedDB("user-data")) || {};
        const allTrades = userData.trades || [];
        const updatedTrades = isEdit
          ? allTrades.map((t) =>
              t._id === res.data.trade._id ? res.data.trade : t,
            )
          : [res.data.trade, ...allTrades];

        await saveToIndexedDB("user-data", {
          ...userData,
          trades: updatedTrades,
        });
        await refreshData();

        localStorage.removeItem("newTradeImage_openImage");
        localStorage.removeItem("newTradeImage_closeImage");

        setTimeout(() => router.push("/trade"), 1500);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      setSubmitStatus("error");
      setToast({
        type: "error",
        message: err.response?.data?.message || "Something went wrong",
      });
      setTimeout(() => setSubmitStatus(""), 2000);
    } finally {
      setLoading(false);
    }
  };

  // Quick PnL sign toggle
  const handleSignChange = (sign) => {
    const currentValue = Number(form.pnl) || 0;
    setForm((prev) => ({
      ...prev,
      pnl:
        sign === "positive" ? Math.abs(currentValue) : -Math.abs(currentValue),
    }));
  };

  // Render entry/exit rows
  const renderRows = (type, items, onAllocationBlur) => (
    <div className="flexClm gap_8">
      {items.map((item, idx) => (
        <div key={idx} className="flexRow gap_8">
          <select
            value={item.mode || "price"}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].mode = e.target.value;
              setForm({ ...form, [type]: newItems });
            }}
            className="select-small"
            style={{ width: "80px" }}
          >
            <option value="price">Price</option>
            <option value="percent">%</option>
          </select>

          <input
            type="number"
            placeholder={item.mode === "price" ? "Price" : "Percent"}
            value={item.mode === "price" ? item.price : item.percent}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx][item.mode === "price" ? "price" : "percent"] =
                e.target.value;
              setForm({ ...form, [type]: newItems });
            }}
            step="any"
            className="flex-1"
          />

          <input
            type="number"
            placeholder="Alloc %"
            value={item.allocation}
            onChange={(e) => {
              const newItems = [...items];
              newItems[idx].allocation = e.target.value;
              setForm({ ...form, [type]: newItems });
            }}
            onBlur={(e) => onAllocationBlur(idx, e.target.value)}
            min="0"
            max="100"
            style={{ width: "80px" }}
          />

          {items.length > 1 && (
            <button
              type="button"
              onClick={() =>
                setForm({ ...form, [type]: items.filter((_, i) => i !== idx) })
              }
              className="btn-icon error"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px 16px 100px",
        background: "var(--mobile-bg)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
            padding: "10px",
            display: "flex",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "600", margin: 0 }}>
          {isEdit ? "Edit Trade" : "Log Trade"}
        </h1>
      </div>

      {/* Trade Type Selector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "12px",
          marginBottom: "24px",
          background: "var(--card-bg)",
          padding: "8px",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
        }}
      >
        <button
          onClick={() => setForm({ ...form, tradeStatus: "quick" })}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background:
              form.tradeStatus === "quick" ? "var(--primary)" : "transparent",
            color:
              form.tradeStatus === "quick" ? "white" : "var(--text-secondary)",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ⚡ Quick Trade
        </button>
        <button
          onClick={() => setForm({ ...form, tradeStatus: "closed" })}
          style={{
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background:
              form.tradeStatus === "closed" ? "var(--primary)" : "transparent",
            color:
              form.tradeStatus === "closed" ? "white" : "var(--text-secondary)",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          📊 Log with Entries
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Symbol & Direction */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Symbol/Ticker
            </label>
            <input
              type="text"
              value={form.symbol}
              onChange={(e) =>
                setForm({ ...form, symbol: e.target.value.toUpperCase() })
              }
              placeholder="e.g., BTCUSD, AAPL"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "16px",
                background: "var(--mobile-bg)",
                outline: "none",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <button
              type="button"
              onClick={() => setForm({ ...form, direction: "long" })}
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: `2px solid ${form.direction === "long" ? "var(--success)" : "var(--border-color)"}`,
                background:
                  form.direction === "long"
                    ? "var(--success-10)"
                    : "transparent",
                color:
                  form.direction === "long"
                    ? "var(--success)"
                    : "var(--text-primary)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <TrendingUp size={18} /> Long
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, direction: "short" })}
              style={{
                padding: "14px",
                borderRadius: "12px",
                border: `2px solid ${form.direction === "short" ? "var(--error)" : "var(--border-color)"}`,
                background:
                  form.direction === "short"
                    ? "var(--error-10)"
                    : "transparent",
                color:
                  form.direction === "short"
                    ? "var(--error)"
                    : "var(--text-primary)",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <TrendingDown size={18} /> Short
            </button>
          </div>
        </div>

        {/* Quick Trade PnL */}
        {tradeStatus === "quick" && (
          <div
            style={{
              background: "var(--card-bg)",
              borderRadius: "20px",
              padding: "20px",
              marginBottom: "16px",
              border: "1px solid var(--border-color)",
            }}
          >
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "12px",
              }}
            >
              Profit & Loss
            </label>
            <div style={{ position: "relative", marginBottom: "16px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "24px",
                  fontWeight: "600",
                  color: "var(--text-secondary)",
                }}
              >
                {currencySymbol}
              </span>
              <input
                type="number"
                value={form.pnl}
                onChange={(e) => setForm({ ...form, pnl: e.target.value })}
                placeholder="0.00"
                step="any"
                style={{
                  width: "100%",
                  padding: "16px 16px 16px 48px",
                  border: "2px solid var(--border-color)",
                  borderRadius: "16px",
                  fontSize: "32px",
                  fontWeight: "700",
                  textAlign: "center",
                  outline: "none",
                  color:
                    Number(form.pnl) > 0
                      ? "var(--success)"
                      : Number(form.pnl) < 0
                        ? "var(--error)"
                        : "var(--text-primary)",
                  background: "var(--mobile-bg)",
                }}
              />
            </div>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                type="button"
                onClick={() => handleSignChange("positive")}
                style={{
                  padding: "8px 20px",
                  background: "var(--success-10)",
                  border: "1px solid var(--success)",
                  borderRadius: "20px",
                  color: "var(--success)",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Plus size={16} /> Profit
              </button>
              <button
                type="button"
                onClick={() => handleSignChange("negative")}
                style={{
                  padding: "8px 20px",
                  background: "var(--error-10)",
                  border: "1px solid var(--error)",
                  borderRadius: "20px",
                  color: "var(--error)",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Minus size={16} /> Loss
              </button>
            </div>
          </div>
        )}

        {/* Entry/Exit for Log with Entries */}
        {tradeStatus === "closed" && (
          <>
            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "20px",
                padding: "20px",
                marginBottom: "16px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontWeight: "600" }}>Entries</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      entries: [...form.entries, { price: "", allocation: "" }],
                    })
                  }
                  className="btn secondary-btn"
                  style={{ padding: "4px 12px" }}
                >
                  + Add Entry
                </button>
              </div>
              {renderRows("entries", form.entries, handleEntryAllocation)}
              {form.avgEntryPrice && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "13px",
                    color: "var(--primary)",
                  }}
                >
                  Avg Entry: {currencySymbol}
                  {form.avgEntryPrice}
                </div>
              )}
            </div>

            <div
              style={{
                background: "var(--card-bg)",
                borderRadius: "20px",
                padding: "20px",
                marginBottom: "16px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                }}
              >
                <span style={{ fontWeight: "600" }}>Exits</span>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      exits: [
                        ...form.exits,
                        {
                          mode: "price",
                          price: "",
                          percent: "",
                          allocation: "",
                        },
                      ],
                    })
                  }
                  className="btn secondary-btn"
                  style={{ padding: "4px 12px" }}
                >
                  + Add Exit
                </button>
              </div>
              {renderRows("exits", form.exits, (idx, val) => {
                setForm((prev) => {
                  let exits = [...prev.exits];
                  let currentVal = Number(val);
                  if (isNaN(currentVal) || currentVal <= 0) return prev;

                  const usedOther = exits.reduce(
                    (sum, e, i) =>
                      i !== idx ? sum + Number(e.allocation || 0) : sum,
                    0,
                  );
                  const remaining = Math.max(0, 100 - usedOther);
                  if (currentVal > remaining) currentVal = remaining;
                  exits[idx].allocation = currentVal;

                  const totalAllocated = exits.reduce(
                    (sum, e) => sum + Number(e.allocation || 0),
                    0,
                  );
                  if (totalAllocated < 100 && idx === exits.length - 1) {
                    exits.push({
                      mode: "price",
                      price: "",
                      percent: "",
                      allocation: "",
                    });
                  } else if (totalAllocated >= 100) {
                    exits = exits.slice(0, idx + 1);
                  }

                  return { ...prev, exits };
                });
              })}
              {form.avgExitPrice && (
                <div
                  style={{
                    marginTop: "12px",
                    fontSize: "13px",
                    color: "var(--primary)",
                  }}
                >
                  Avg Exit: {currencySymbol}
                  {form.avgExitPrice}
                </div>
              )}
            </div>
          </>
        )}

        {/* Quantity Section */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Quantity (USD)
            </label>
            <input
              type="number"
              value={form.quantityUSD}
              onChange={(e) =>
                setForm({ ...form, quantityUSD: e.target.value })
              }
              placeholder="1000"
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "16px",
                background: "var(--mobile-bg)",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Leverage
            </label>
            <select
              value={form.leverage}
              onChange={(e) => setForm({ ...form, leverage: e.target.value })}
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "16px",
                background: "var(--mobile-bg)",
                outline: "none",
              }}
            >
              {[1, 2, 3, 4, 5, 10, 20, 50, 100].map((lev) => (
                <option key={lev} value={lev}>
                  {lev}x
                </option>
              ))}
            </select>
          </div>

          {form.totalQuantity > 0 && (
            <div
              style={{
                marginTop: "12px",
                padding: "10px",
                background: "var(--primary-10)",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <span
                style={{ fontSize: "12px", color: "var(--text-secondary)" }}
              >
                Total Position:
              </span>{" "}
              <span style={{ fontWeight: "600", color: "var(--primary)" }}>
                {currencySymbol}
                {form.totalQuantity.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Time Section */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Open Time
            </label>
            <button
              type="button"
              onClick={() => setShowOpenTimePicker(true)}
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "14px",
                background: "var(--mobile-bg)",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Clock size={16} />
              {new Date(form.openTime).toLocaleString()}
            </button>
          </div>

          <div>
            <label
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              Close Time
            </label>
            <button
              type="button"
              onClick={() => setShowCloseTimePicker(true)}
              style={{
                width: "100%",
                padding: "14px",
                border: "1px solid var(--border-color)",
                borderRadius: "12px",
                fontSize: "14px",
                background: "var(--mobile-bg)",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Clock size={16} />
              {new Date(form.closeTime).toLocaleString()}
            </button>
          </div>
        </div>

        {/* Images Section */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <Camera size={18} />
            <span style={{ fontWeight: "600" }}>Screenshots</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {/* Entry Image */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Entry
              </div>
              {form.openImagePreview ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={form.openImagePreview}
                    alt="Entry"
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "12px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleImageRemove("openImage")}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "var(--error)",
                      border: "none",
                      borderRadius: "20px",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={14} color="white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleImageSelect("openImage")}
                  style={{
                    width: "100%",
                    height: "100px",
                    border: "2px dashed var(--border-color)",
                    borderRadius: "12px",
                    background: "var(--mobile-bg)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={20} />
                  <span style={{ fontSize: "10px" }}>Upload</span>
                </button>
              )}
            </div>

            {/* Exit Image */}
            <div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Exit
              </div>
              {form.closeImagePreview ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={form.closeImagePreview}
                    alt="Exit"
                    style={{
                      width: "100%",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "12px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleImageRemove("closeImage")}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      background: "var(--error)",
                      border: "none",
                      borderRadius: "20px",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={14} color="white" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleImageSelect("closeImage")}
                  style={{
                    width: "100%",
                    height: "100px",
                    border: "2px dashed var(--border-color)",
                    borderRadius: "12px",
                    background: "var(--mobile-bg)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={20} />
                  <span style={{ fontSize: "10px" }}>Upload</span>
                </button>
              )}
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            style={{ display: "none" }}
          />
        </div>

        {/* Reasons Section */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "16px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setShowReasonSelector(!showReasonSelector)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Brain size={18} />
              <span style={{ fontWeight: "600" }}>Trade Reasons</span>
            </div>
            <ChevronRight
              size={18}
              style={{
                transform: showReasonSelector ? "rotate(90deg)" : "none",
              }}
            />
          </div>

          <AnimatePresence>
            {showReasonSelector && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden", marginTop: "16px" }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {reasonOptions.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      onClick={() => {
                        const newReasons = form.reason.includes(reason)
                          ? form.reason.filter((r) => r !== reason)
                          : [...form.reason, reason];
                        setForm({ ...form, reason: newReasons });
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: "none",
                        background: form.reason.includes(reason)
                          ? "var(--primary)"
                          : "var(--black-4)",
                        color: form.reason.includes(reason)
                          ? "white"
                          : "var(--text-primary)",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {form.reason.length > 0 && !showReasonSelector && (
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                flexWrap: "wrap",
                gap: "4px",
              }}
            >
              {form.reason.slice(0, 3).map((r) => (
                <span
                  key={r}
                  style={{
                    fontSize: "11px",
                    background: "var(--black-4)",
                    padding: "4px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {r}
                </span>
              ))}
              {form.reason.length > 3 && <span>+{form.reason.length - 3}</span>}
            </div>
          )}
        </div>

        {/* Learnings Section */}
        <div
          style={{
            background: "var(--card-bg)",
            borderRadius: "20px",
            padding: "20px",
            marginBottom: "24px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() => setShowLearnings(!showLearnings)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Target size={18} />
              <span style={{ fontWeight: "600" }}>Key Learnings</span>
            </div>
            <ChevronRight
              size={18}
              style={{ transform: showLearnings ? "rotate(90deg)" : "none" }}
            />
          </div>

          <AnimatePresence>
            {showLearnings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: "hidden", marginTop: "16px" }}
              >
                <textarea
                  value={form.learnings}
                  onChange={(e) =>
                    setForm({ ...form, learnings: e.target.value })
                  }
                  placeholder="What did you learn from this trade?"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                    fontSize: "14px",
                    background: "var(--mobile-bg)",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {form.learnings && !showLearnings && (
            <div style={{ marginTop: "12px", fontSize: "13px", opacity: 0.7 }}>
              {form.learnings.substring(0, 50)}
              {form.learnings.length > 50 && "..."}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "18px",
            background: "var(--primary)",
            border: "none",
            borderRadius: "16px",
            color: "white",
            fontSize: "16px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: "20px",
          }}
        >
          {loading ? (
            <>
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid white",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}
              />
              {submitStatus === "submitting" && "Submitting..."}
              {submitStatus === "success" && "Success! Redirecting..."}
              {submitStatus === "error" && "Failed. Try again?"}
            </>
          ) : (
            <>
              <Save size={18} />
              {isEdit ? "Update Trade" : "Log Trade"}
            </>
          )}
        </button>
      </form>

      {/* Time Pickers */}
      {showOpenTimePicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              padding: "20px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "400px",
            }}
          >
            <DateTimePicker
              value={form.openTime}
              onChange={(date) => {
                setForm({ ...form, openTime: date });
                setShowOpenTimePicker(false);
              }}
              onClose={() => setShowOpenTimePicker(false)}
            />
          </div>
        </div>
      )}

      {showCloseTimePicker && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--card-bg)",
              padding: "20px",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "400px",
            }}
          >
            <DateTimePicker
              value={form.closeTime}
              onChange={(date) => {
                setForm({ ...form, closeTime: date });
                setShowCloseTimePicker(false);
              }}
              onClose={() => setShowCloseTimePicker(false)}
            />
          </div>
        </div>
      )}

      {/* Toast */}
      {toast.message && (
        <ToastMessage
          type={toast.type}
          message={toast.message}
          onClose={() => setToast({ type: "", message: "" })}
        />
      )}

      {/* Plan Limit Modal */}
      <PlanLimitModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onUpgrade={() => router.push("/pricing")}
      />

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .flex-1 {
          flex: 1;
        }
        .select-small {
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--mobile-bg);
          font-size: 12px;
        }
        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .btn-icon.error:hover {
          background: var(--error-10);
          border-color: var(--error);
        }
      `}</style>
    </div>
  );
}
