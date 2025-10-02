import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";
import { saveToIndexedDB } from "@/utils/indexedDB";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatNumber } from "@/utils/formatNumbers"; //
import Navbar from "@/components/Auth/Navbar";
import {
  ArrowDownRight,
  ArrowLeftCircle,
  ArrowRight,
  ArrowUpRightIcon,
  Check,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import DateTimePicker from "@/components/ui/DateTimePicker";
import Ticker from "@/components/addTrade/Ticker";
import QuantityGrid from "@/components/addTrade/Quantity";
import TradeStatusGrid from "@/components/addTrade/Status";
import EntriesSection from "@/components/addTrade/Entries";
import QuickSection from "@/components/addTrade/Quick";
import StopLossSection from "@/components/addTrade/SL";
import TakeProfitSection from "@/components/addTrade/TP";
import DateTimeImageSection from "@/components/addTrade/OpenTime";
import TextAreaField from "@/components/addTrade/Learnings";
import ToggleSwitch from "@/components/addTrade/Rules";
import ExitsSection from "@/components/addTrade/Exits";
import { motion, AnimatePresence } from "framer-motion";
import { containerVariants } from "@/animations/motionVariants"; // adjust path if needed
import ToastMessage from "@/components/ui/ToastMessage";
import FullPageLoader from "@/components/ui/FullPageLoader";
import ReasonSelector from "@/components/addTrade/Reasons";
import StepWizard from "@/components/ui/StepWizard";

const TRADE_KEY = "__t_rd_iD";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AddTrade() {
  const router = useRouter();
  const firstExitRef = useRef(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [toast, setToast] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [activeGrid, setActiveGrid] = useState(null);

  const statuses = [
    { value: "running", label: "Running" },
    { value: "closed", label: "Closed" },
    { value: "quick", label: "Quick" },
  ];

  const [isFormValid, setIsFormValid] = useState(false);

  // format local datetime for <input type="datetime-local" />
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

  const [form, setForm] = useState({
    symbol: "",
    direction: "long",
    quantityUSD: "",
    leverage: "1",
    totalQuantity: 0,
    tradeStatus: "running",
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
    openTime: getLocalDateTime(),
    closeTime: null,

    // Fee Fields
    feeType: "percent", // "percent" or "currency"
    feeValue: "",
    feeAmount: 0,
    pnlAfterFee: 0,

    // Images
    openImage: null,
    openImagePreview: "",
    closeImage: null,
    closeImagePreview: "",

    // Derived values
    duration: 0,
    rr: "",
    pnl: "",
    expectedProfit: 0,
    expectedLoss: 0,
  });

  const validateForm = (form) => {
    if (!form.symbol.trim()) return "Symbol name is required";
    if (!form.quantityUSD || Number(form.quantityUSD) <= 0)
      return "Margin is required";

    if (form.tradeStatus === "quick") {
      if (form.pnl === "" || form.pnl === null)
        return "Net Profit or Loss (PnL) is required";

      // ✅ CloseTime required for quick trades
      if (!form.closeTime) return "Close time is required for quick trades";
    } else {
      // Entries required (only for running/closed)
      if (!form.entries || form.entries.length === 0 || !form.entries[0].price)
        return "At least one entry is required";

      if (form.tradeStatus === "closed") {
        // Check if at least one exit has a valid price or percent
        const hasValidExit =
          form.exits &&
          form.exits.some(
            (exit) =>
              (exit.price !== "" && exit.price !== null) ||
              (exit.percent !== "" && exit.percent !== null)
          );

        if (!hasValidExit) return "At least one exit is required";

        if (!form.closeTime) return "Close time is required for closed trades";
      }

      if (form.tradeStatus === "running") {
        // TP required: at least one with price OR percent
        if (
          !form.tps ||
          form.tps.length === 0 ||
          ((form.tps[0].price === "" || form.tps[0].price === null) &&
            (form.tps[0].percent === "" || form.tps[0].percent === null))
        ) {
          return "At least one Take Profit (TP) is required (price or percent)";
        }

        // SL required: at least one with price OR percent
        if (
          !form.sls ||
          form.sls.length === 0 ||
          ((form.sls[0].price === "" || form.sls[0].price === null) &&
            (form.sls[0].percent === "" || form.sls[0].percent === null))
        ) {
          return "At least one Stop Loss (SL) is required (price or percent)";
        }
      }
    }

    // Duration must be positive
    // if (form.duration < 0) return "Duration should be positive";

    // ✅ CloseTime can’t be before OpenTime (only if both exist)
    if (form.closeTime && form.openTime) {
      if (new Date(form.closeTime) < new Date(form.openTime)) {
        return "Close date cannot be earlier than Open time";
      }
    }

    return null; // ✅ No errors
  };

  useEffect(() => {
    const error = validateForm(form);
    setIsFormValid(!error); // true if no error, false otherwise
  }, [form]);

  // 🔍 detect edit mode
  const isEdit = router.query.mode === "edit" || router.query.mode === "close";

  useEffect(() => {
    const prefillTrade = async () => {
      if (!isEdit) return;

      const tradeId = localStorage.getItem(TRADE_KEY);
      if (!tradeId) return;

      const userData = await getFromIndexedDB("user-data");
      const tradeData = userData?.trades?.find((t) => t._id === tradeId);

      if (tradeData) {
        let parsedReason = [];

        if (Array.isArray(tradeData.reason)) {
          // If first item is a stringified JSON, parse it
          if (
            tradeData.reason.length === 1 &&
            typeof tradeData.reason[0] === "string"
          ) {
            try {
              parsedReason = JSON.parse(tradeData.reason[0]);
            } catch {
              parsedReason = tradeData.reason; // fallback
            }
          } else {
            parsedReason = tradeData.reason;
          }
        }

        // Calculate fee values if they don't exist in the trade data
        // (for backward compatibility with existing trades)
        let feeAmount = tradeData.feeAmount || 0;
        let pnlAfterFee = tradeData.pnlAfterFee || 0;

        // If fee data exists but pnlAfterFee doesn't, calculate it
        if (tradeData.feeType && tradeData.feeValue && !tradeData.pnlAfterFee) {
          feeAmount =
            tradeData.feeType === "percent"
              ? (tradeData.totalQuantity || 0) * (tradeData.feeValue / 100)
              : tradeData.feeValue;
          pnlAfterFee = (tradeData.pnl || 0) - feeAmount;
        }

        setForm({
          ...form,
          ...tradeData,
          // Fee fields with fallback values
          feeType: tradeData.feeType || "",
          feeValue: tradeData.feeValue || "",
          feeAmount: feeAmount,
          pnlAfterFee: pnlAfterFee,

          reason: parsedReason, // ✅ fix here
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
      }
    };

    prefillTrade();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit]);

  useEffect(() => {
    if (router.query.mode === "close") {
      // scroll & focus after slight delay
      setTimeout(() => {
        firstExitRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        firstExitRef.current?.focus();
      }, 300);
    }
  }, [router.query.mode]);

  useEffect(() => {
    const avgEntry = calcWeightedAverage(form.entries, null, form.direction);
    const avgTP = calcWeightedAverage(form.tps, avgEntry, form.direction);
    const avgSL = calcWeightedAverage(form.sls, avgEntry, form.direction);
    const avgExit = calcWeightedAverage(form.exits, avgEntry, form.direction);

    // Duration (hours)
    let duration = 0;
    if (form.openTime && form.closeTime) {
      const start = new Date(form.openTime);
      const end = new Date(form.closeTime);
      duration = ((end - start) / (1000 * 60 * 60)).toFixed(2);
    }

    // Expected Profit / Loss (store as USD)
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

    // Risk-Reward Ratio
    let rr = "";
    if (expectedLoss && expectedProfit && expectedLoss !== "0") {
      const rawRR = expectedProfit / Math.abs(expectedLoss);
      rr = `1:${Number(rawRR.toFixed(2))}`;
    }

    // PnL (only for closed trades, stored as USD)
    let pnl = form.pnl; // keep DB value if not closed

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

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const cachedUser = await getFromIndexedDB("user-data");
        console.log("📂 cachedUser:", cachedUser);

        if (cachedUser?.accounts?.length > 0) {
          const accountId = Cookies.get("accountId"); // ✅ active account from cookies
          console.log("🍪 Active Account ID from cookies:", accountId);

          const activeAccount = cachedUser.accounts.find(
            (acc) => acc._id === accountId
          );

          if (activeAccount?.currency) {
            setCurrencySymbol(getCurrencySymbol(activeAccount.currency));
          } else {
            console.warn(
              "⚠️ No matching account found or missing currency field."
            );
          }
        } else {
          console.warn("⚠ No accounts found in IndexedDB");
        }
      } catch (err) {
        console.error("❌ Error fetching accounts from IndexedDB:", err);
      }
    };

    fetchAccounts();
  }, []);

  // --- Helpers ---

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => {
      let updated = { ...prev, [name]: value };

      // ✅ Update totalQuantity when quantityUSD or leverage changes
      if (name === "quantityUSD" || name === "leverage") {
        updated.totalQuantity =
          (Number(updated.quantityUSD) || 0) * (Number(updated.leverage) || 0);
      }

      // ✅ Clear certain fields when tradeStatus changes
      if (name === "tradeStatus") {
        const shouldClearFields = true; // replace with your actual condition if needed

        if (shouldClearFields) {
          updated = {
            ...updated,
            entries: [{ price: "", allocation: "100" }],
            exits: [{ mode: "price", price: "", percent: "", allocation: "" }],
            tps: [{ mode: "price", price: "", percent: "", allocation: "" }],
            sls: [{ mode: "price", price: "", percent: "", allocation: "" }],
            rulesFollowed: false,
            avgEntryPrice: "",
            avgExitPrice: "",
            avgSLPrice: "",
            avgTPPrice: "",
            duration: 0,
            rr: "",
            pnl: "",
            expectedProfit: 0,
            expectedLoss: 0,
            closeTime: null,
          };
        }
      }

      return updated;
    });
  };

  const updateExit = (idx, field, value) => {
    setForm((prev) => {
      const exits = [...prev.exits];
      exits[idx] = { ...exits[idx], [field]: value };
      return { ...prev, exits };
    });
  };

  const formatPrice = (num) => {
    if (num < 1) {
      return num.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    } else {
      return num.toFixed(2);
    }
  };

  // calculate weighted average from array of { price, allocation }
  const calcWeightedAverage = (arr, avgEntryPrice, direction = "long") => {
    let totalAlloc = 0;
    let weighted = 0;

    arr.forEach((x) => {
      let price;

      if (x.mode === "percent" && x.percent !== "") {
        price = Number(
          calcPriceFromPercent(avgEntryPrice, x.percent, direction)
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

  const handleAllocationBlur = (idx, value) => {
    setForm((prev) => {
      let entries = [...prev.entries];
      let currentVal = Number(value);

      if (isNaN(currentVal) || currentVal <= 0) {
        return prev;
      }

      // calculate remaining allocation
      const usedOther = entries.reduce(
        (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
        0
      );
      const remaining = Math.max(0, 100 - usedOther);

      // clamp allocation to remaining
      if (currentVal > remaining) currentVal = remaining;
      entries[idx].allocation = currentVal;

      // calculate total allocation
      const totalAllocated = entries.reduce(
        (sum, e) => sum + Number(e.allocation || 0),
        0
      );

      // if < 100 and this is last entry → add new slot
      if (totalAllocated < 100 && idx === entries.length - 1) {
        entries.push({ price: "", allocation: "" });
      } else if (totalAllocated >= 100) {
        // cut off extra slots
        entries = entries.slice(0, idx + 1);
      }

      // --- Calculate weighted average entry price ---
      let weightedSum = 0;
      let totalWeight = 0;
      entries.forEach((e) => {
        const price = Number(e.price);
        const alloc = Number(e.allocation);
        if (price > 0 && alloc > 0) {
          weightedSum += price * (alloc / 100);
          totalWeight += alloc / 100;
        }
      });

      const avg = totalWeight > 0 ? weightedSum / totalWeight : "";

      const avgPrice = avg !== "" ? formatPrice(avg) : "";

      // update separate state
      setForm((prev) => ({
        ...prev,
        avgEntryPrice: avgPrice,
      }));

      return { ...prev, entries };
    });
  };

  const handleExitAllocationBlur = (idx, value) => {
    setForm((prev) => {
      let exits = [...prev.exits];
      let currentVal = Number(value);

      if (isNaN(currentVal) || currentVal <= 0) {
        return prev;
      }

      // calculate remaining allocation
      const usedOther = exits.reduce(
        (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
        0
      );
      const remaining = Math.max(0, 100 - usedOther);

      // clamp allocation to remaining
      if (currentVal > remaining) currentVal = remaining;
      exits[idx].allocation = currentVal;

      // calculate total allocated
      const totalAllocated = exits.reduce(
        (sum, e) => sum + Number(e.allocation || 0),
        0
      );

      // if < 100 and this is last exit → add new slot
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

      // --- Calculate weighted average exit price ---
      let weightedSum = 0;
      let totalWeight = 0;
      exits.forEach((e) => {
        let exitPrice =
          e.mode === "percent"
            ? calcPriceFromPercent(
                form.avgEntryPrice,
                e.percent,
                prev.direction
              )
            : e.price;

        const priceNum = Number(exitPrice);
        const alloc = Number(e.allocation);

        if (priceNum > 0 && alloc > 0) {
          weightedSum += priceNum * (alloc / 100);
          totalWeight += alloc / 100;
        }
      });

      const avgExitPrice =
        totalWeight > 0 ? formatPrice(weightedSum / totalWeight) : "";

      return { ...prev, exits, avgExitPrice };
    });
  };

  const handleSLAllocationBlur = (idx, value) => {
    setForm((prev) => {
      let sls = [...prev.sls];
      let currentVal = Number(value);

      if (isNaN(currentVal) || currentVal <= 0) {
        return prev;
      }

      const usedOther = sls.reduce(
        (sum, sl, i) => (i !== idx ? sum + Number(sl.allocation || 0) : sum),
        0
      );
      const remaining = Math.max(0, 100 - usedOther);

      if (currentVal > remaining) currentVal = remaining;
      sls[idx].allocation = currentVal;

      const totalAllocated = sls.reduce(
        (sum, sl) => sum + Number(sl.allocation || 0),
        0
      );
      if (totalAllocated < 100 && idx === sls.length - 1) {
        sls.push({ mode: "price", price: "", percent: "", allocation: "" });
      } else if (totalAllocated >= 100) {
        sls = sls.slice(0, idx + 1);
      }

      // --- Weighted Average SL Price ---
      let weightedSum = 0;
      let totalWeight = 0;

      sls.forEach((s) => {
        let slPrice;

        if (s.mode === "percent") {
          // ✅ Use percentage exactly as entered
          const percentNum = Number(s.percent);

          slPrice = calcPriceFromPercent(
            form.avgEntryPrice,
            percentNum, // <-- negative keeps it below, positive adds above
            prev.direction
          );
        } else {
          slPrice = s.price;
        }

        const priceNum = Number(slPrice);
        const alloc = Number(s.allocation);

        if (!isNaN(priceNum) && alloc > 0) {
          weightedSum += priceNum * (alloc / 100);
          totalWeight += alloc / 100;
        }
      });

      const avgSLPrice =
        totalWeight > 0 ? formatPrice(weightedSum / totalWeight) : "";

      return { ...prev, sls, avgSLPrice };
    });
  };

  const handleTPAllocationBlur = (idx, value) => {
    setForm((prev) => {
      let tps = [...prev.tps];
      let currentVal = Number(value);

      if (isNaN(currentVal) || currentVal <= 0) {
        return prev;
      }

      const usedOther = tps.reduce(
        (sum, tp, i) => (i !== idx ? sum + Number(tp.allocation || 0) : sum),
        0
      );
      const remaining = Math.max(0, 100 - usedOther);

      if (currentVal > remaining) currentVal = remaining;
      tps[idx].allocation = currentVal;

      const totalAllocated = tps.reduce(
        (sum, tp) => sum + Number(tp.allocation || 0),
        0
      );
      if (totalAllocated < 100 && idx === tps.length - 1) {
        tps.push({ mode: "price", price: "", percent: "", allocation: "" });
      } else if (totalAllocated >= 100) {
        tps = tps.slice(0, idx + 1);
      }

      // --- Weighted Average TP Price ---
      let weightedSum = 0;
      let totalWeight = 0;
      tps.forEach((t) => {
        let tpPrice =
          t.mode === "percent"
            ? calcPriceFromPercent(
                form.avgEntryPrice,
                t.percent,
                prev.direction
              )
            : t.price;

        const priceNum = Number(tpPrice);
        const alloc = Number(t.allocation);

        if (priceNum > 0 && alloc > 0) {
          weightedSum += priceNum * (alloc / 100);
          totalWeight += alloc / 100;
        }
      });

      const avgTPPrice =
        totalWeight > 0 ? formatPrice(weightedSum / totalWeight) : "";

      return { ...prev, tps, avgTPPrice };
    });
  };

  const calcPriceFromPercent = (avgEntryPrice, percent, direction = "long") => {
    const base = Number(avgEntryPrice);
    const pct = Number(percent);
    if (!base || !pct) return "";

    let price;
    if (direction === "long") {
      price = base * (1 + pct / 100);
    } else {
      price = base * (1 - pct / 100);
    }
    return formatPrice(price);
  };
  // AddTrade - part of component

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  // helper: read file as dataURL
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  function handleImageChange(e, field, setForm) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert("❌ Image size cannot exceed 5MB.");
      e.target.value = ""; // reset input
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    // set preview & file in local state (form)
    setForm((prev) => ({
      ...prev,
      [field]: file, // keep file in memory for immediate submit if user doesn't redirect
      [`${field}Preview`]: previewUrl,
    }));

    // convert to base64 and save into localStorage along with name & type
    fileToDataUrl(file).then((dataUrl) => {
      try {
        const payload = JSON.stringify({
          dataUrl,
          name: file.name,
          type: file.type,
          ts: Date.now(),
        });
        // store per-field to avoid collisions
        localStorage.setItem(`newTradeImage_${field}`, payload);
      } catch (err) {
        console.error("Failed to save image to localStorage", err);
      }
    });
  }

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();

    const totalQuantity = parseFloat(form.totalQuantity) || 0;
    const pnl = parseFloat(form.pnl) || 0;

    let entryFee = 0;
    let exitFee = 0;
    let feeAmount = 0;
    let pnlAfterFee = pnl;

    if (form.feeType && form.feeValue) {
      if (form.feeType === "percent") {
        // Entry fee is always calculated on total quantity
        entryFee = totalQuantity * (form.feeValue / 100);

        // Exit fee calculated only if pnl is available
        if (pnl) {
          exitFee = (totalQuantity + pnl) * (form.feeValue / 100);
        }
      } else if (form.feeType === "currency") {
        entryFee = parseFloat(form.feeValue);
        // Only charge exit fee if pnl exists
        if (pnl) exitFee = parseFloat(form.feeValue);
      }

      feeAmount = entryFee + exitFee;

      // PnL after fees
      pnlAfterFee = pnl
        ? totalQuantity + pnl - feeAmount
        : totalQuantity - feeAmount;
    }

    const updatedForm = {
      ...form,
      feeAmount,
      pnlAfterFee,
    };

    const validationError = validateForm(updatedForm);
    if (validationError) {
      setToast(null);
      setTimeout(() => {
        setToast({ type: "error", message: validationError });
      }, 0);
      return;
    }

    setLoading(true);

    try {
      // Save serializable form data in session/local storage
      const serializable = {
        ...updatedForm,
        openImage: null,
        closeImage: null,
      };

      if (!serializable.closeTime) {
        delete serializable.closeTime;
      }

      sessionStorage.setItem("newTradeData", JSON.stringify(serializable));
      sessionStorage.setItem("isEditTrade", isEdit ? "true" : "false");

      router.push({
        pathname: "/trade",
        query: { isNewTrade: "true" },
      });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Something went wrong." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = activeGrid ? "hidden" : "auto";
  }, [activeGrid]);

  useEffect(() => {
    const handleKeyDown = (e) => {};

    if (activeGrid) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeGrid]);

  const grids = [
    {
      key: "Ticker",
      content: (
        <Ticker form={form} setForm={setForm} handleChange={handleChange} />
      ),
    },
    {
      key: "quantity",
      content: (
        <QuantityGrid
          form={form}
          handleChange={handleChange}
          currencySymbol={currencySymbol}
        />
      ),
    },
    {
      key: "status",
      content: (
        <TradeStatusGrid
          form={form}
          handleChange={handleChange}
          statuses={statuses}
        />
      ),
    },
    {
      key: "entries",
      content: (
        <EntriesSection
          form={form}
          setForm={setForm}
          currencySymbol={currencySymbol}
          formatPrice={formatPrice}
          formatNumber={formatNumber}
          handleAllocationBlur={handleAllocationBlur}
        />
      ),
    },
    {
      key: "exits",
      content: (
        <ExitsSection
          form={form}
          setForm={setForm}
          firstExitRef={firstExitRef}
          updateExit={updateExit}
          currencySymbol={currencySymbol}
          handleExitAllocationBlur={handleExitAllocationBlur}
          calcPriceFromPercent={calcPriceFromPercent}
          formatPrice={formatPrice}
          formatNumber={formatNumber}
        />
      ),
    },
    {
      key: "quick",
      content: (
        <QuickSection
          form={form}
          setForm={setForm}
          currency={currencySymbol}
          handleChange={handleChange}
        />
      ),
    },
    {
      key: "sl",
      content: (
        <StopLossSection
          form={form}
          setForm={setForm}
          calcPriceFromPercent={calcPriceFromPercent}
          formatPrice={formatPrice}
          currencySymbol={currencySymbol}
          handleSLAllocationBlur={handleSLAllocationBlur}
        />
      ),
    },
    {
      key: "tp",
      content: (
        <TakeProfitSection
          form={form}
          setForm={setForm}
          calcPriceFromPercent={calcPriceFromPercent}
          formatPrice={formatPrice}
          currencySymbol={currencySymbol}
          handleTPAllocationBlur={handleTPAllocationBlur}
        />
      ),
    },
    {
      key: "opentime",
      content: (
        <DateTimeImageSection
          label="Open Time"
          dateValue={form.openTime}
          onDateChange={(date) =>
            setForm((prev) => ({ ...prev, openTime: date }))
          }
          imagePreview={form.openImagePreview}
          onImageChange={(e) => handleImageChange(e, "openImage", setForm)}
          onRemove={() =>
            setForm((prev) => ({
              ...prev,
              openImage: null,
              openImagePreview: "",
            }))
          }
        />
      ),
    },
    {
      key: "closetime",
      content: (
        <DateTimeImageSection
          label="Close Time"
          dateValue={form.closeTime}
          onDateChange={(date) =>
            setForm((prev) => ({ ...prev, closeTime: date }))
          }
          imagePreview={form.closeImagePreview}
          onImageChange={(e) => handleImageChange(e, "closeImage", setForm)}
          onRemove={() =>
            setForm((prev) => ({
              ...prev,
              closeImage: null,
              closeImagePreview: "",
            }))
          }
        />
      ),
    },
    {
      key: "rules",
      content: (
        <ToggleSwitch
          label="Rules"
          value={form.rulesFollowed}
          onToggle={() =>
            setForm((prev) => ({ ...prev, rulesFollowed: !prev.rulesFollowed }))
          }
        />
      ),
    },
    {
      key: "reasons",
      content: (
        <ReasonSelector
          label="Reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
        />
      ),
    },
    {
      key: "learnings",
      content: (
        <TextAreaField
          label="Learnings"
          name="learnings"
          value={form.learnings}
          onChange={handleChange}
          placeholder="What did you learn from this trade?"
        />
      ),
    },
  ];

  // helper to filter grids dynamically
  const getFilteredGrids = (status) => {
    switch (status) {
      case "quick":
        return grids.filter((g) =>
          [
            "Ticker",
            "quantity",
            "status",
            "quick",
            "opentime",
            "closetime",
            "reasons",
            "learnings",
          ].includes(g.key)
        );

      case "closed":
        return grids.filter((g) =>
          [
            "Ticker",
            "quantity",
            "status",
            "entries",
            "exits",
            "opentime",
            "closetime",
            "reasons",
            "learnings",
          ].includes(g.key)
        );

      case "running":
        return grids.filter((g) =>
          [
            "Ticker",
            "quantity",
            "status",
            "entries",
            "sl",
            "tp",
            "opentime",
            "reasons",
            "learnings",
          ].includes(g.key)
        );

      default:
        return grids;
    }
  };

  return (
    <div className="flexClm gap_32">
      <div>
        <div className="flexClm">
          <span className="font_20">Add trade</span>
          <span className="font_12">Log trade in seconds</span>
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        <StepWizard
          grids={getFilteredGrids(form.tradeStatus)} // pass only required steps
          onFinish={handleSubmit}
        />
      </form>

      {toast && (
        <ToastMessage
          type={toast.type}
          message={toast.message}
          duration={3000}
        />
      )}

      {loading && <FullPageLoader />}

      <div
        className="popups_btm flexRow flexRow_stretch gap_8"
        style={{
          width: "90%",
          backdropFilter: "blur(20px)",
          padding: "8px 8px",
        }}
      >
        <button
          className="button_sec"
          style={{ width: "100%" }}
          onClick={() => router.push("/trade")}
        >
          Cancel
        </button>

        <button
          className="button_pri"
          style={{ width: "100%" }}
          onClick={handleSubmit}
          disabled={loading || !isFormValid} // 🔒 disabled while loading or form invalid
        >
          {loading
            ? "⏳ Please wait..."
            : isEdit
            ? "Update Trade"
            : "Submit Trade"}
        </button>
      </div>

      <BackgroundBlur />

      {/* <pre
        style={{
          background: "black",
          color: "white",
          padding: "1rem",
          borderRadius: "8px",
        }}
      >
        {JSON.stringify(
          {
            ...form,
            avgEntryPrice: form.avgEntryPrice,
          },
          null,
          2
        )}
      </pre> */}

      {/* Summary Section */}
      {/* <div style={{ marginTop: "2rem" }}>
                <h3>Trade Setup Summary</h3>

               


               
                <div
                    style={{
                        background: "#fff",
                        padding: "1.5rem",
                        borderRadius: "10px",
                        marginTop: "1rem",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    }}
                >
                    <h4>📊 Trade Overview</h4>
                    <p><strong>Symbol:</strong> {form.symbol}</p>
                    <p><strong>Direction:</strong> {form.direction}</p>
                    <p><strong>Quantity (USD):</strong> {form.quantityUSD}</p>
                    <p><strong>Leverage:</strong> {form.leverage}</p>
                    <p><strong>Total Quantity:</strong> {form.totalQuantity}</p>
                    <p><strong>Status:</strong> {form.tradeStatus}</p>

                    <h5>🟢 Entries</h5>
                    <ul>
                        {form.entries.map((e, i) => (
                            <li key={i}>
                                Price: {e.price} | Allocation: {e.allocation}%
                            </li>
                        ))}
                    </ul>
                    {form.avgEntryPrice && (
                        <p><strong>Average Entry Price:</strong> {form.avgEntryPrice
                        }</p>
                    )}

                    <h5>🔴 Exits</h5>
                    <ul>
                        {form.exits.map((e, i) => (
                            <li key={i}>
                                Mode: {e.mode} | {e.mode === "percent" ? `Percent: ${e.percent}%` : `Price: ${e.price}`} |
                                Allocation: {e.allocation}%
                            </li>
                        ))}
                    </ul>
                    {form.avgExitPrice && (
                        <p><strong>Average Exit Price:</strong> {form.avgExitPrice}</p>
                    )}

                    <h5>🛑 Stop Losses</h5>
                    <ul>
                        {form.sls.map((sl, i) => (
                            <li key={i}>
                                Mode: {sl.mode} | {sl.mode === "percent" ? `Percent: ${sl.percent}%` : `Price: ${sl.price}`} |
                                Allocation: {sl.allocation}%
                            </li>
                        ))}
                    </ul>
                    {form.avgSLPrice && (
                        <p><strong>Average SL Price:</strong> {form.avgSLPrice}</p>
                    )}

                    <h5>🎯 Take Profits</h5>
                    <ul>
                        {form.tps.map((tp, i) => (
                            <li key={i}>
                                Mode: {tp.mode} | {tp.mode === "percent" ? `Percent: ${tp.percent}%` : `Price: ${tp.price}`} |
                                Allocation: {tp.allocation}%
                            </li>
                        ))}
                    </ul>
                    {form.avgTPPrice && (
                        <p><strong>Average TP Price:</strong> {form.avgTPPrice}</p>
                    )}

                    <h5>📝 Notes</h5>
                    <p><strong>Rules Followed:</strong> {form.rulesFollowed ? "✅ Yes" : "❌ No"}</p>
                    <p><strong>Reason:</strong> {form.reason}</p>
                    <p><strong>Learnings:</strong> {form.learnings}</p>
                </div>
            </div> */}
    </div>
  );
}
