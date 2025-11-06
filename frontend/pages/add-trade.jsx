import EntriesSection from "@/components/addTrade/Entries";
import ExitsSection from "@/components/addTrade/Exits";
import TextAreaField from "@/components/addTrade/Learnings";
import DateTimeImageSection from "@/components/addTrade/OpenTime";
import QuantityGrid from "@/components/addTrade/Quantity";
import QuickSection from "@/components/addTrade/Quick";
import ReasonSelector from "@/components/addTrade/Reasons";
import ToggleSwitch from "@/components/addTrade/Rules";
import StopLossSection from "@/components/addTrade/SL";
import TradeStatusGrid from "@/components/addTrade/Status";
import TakeProfitSection from "@/components/addTrade/TP";
import Ticker from "@/components/addTrade/Ticker";
import FullPageLoader from "@/components/ui/FullPageLoader";
import ModalWrapper from "@/components/ui/ModalWrapper";
import StepWizard from "@/components/ui/StepWizard";
import ToastMessage from "@/components/ui/ToastMessage";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatNumber } from "@/utils/formatNumbers"; //
import { getFromIndexedDB } from "@/utils/indexedDB";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatCurrency } from "@/utils/formatNumbers";
import {
  ArrowRight,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Edit3,
  EditIcon,
  Eye,
  Plus,
  Repeat,
  Shield,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import dayjs from "dayjs";
import { Edit } from "lucide";
import { canAddTrade, canUploadImage } from "@/utils/planRestrictions";

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

  // ==============================
  // 🕒 Date & Time Utilities
  // ==============================

  // Format local datetime for <input type="datetime-local" />
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

  // ==============================
  // 🧾 Form State Initialization
  // ==============================
  const now = new Date().toISOString();

  const [form, setForm] = useState({
    // 🔹 Basic Trade Info
    symbol: "",
    direction: "long",
    quantityUSD: 1,
    leverage: 1,
    totalQuantity: 1,
    tradeStatus: "quick", // "quick" or "running"

    // 🔹 Entry / Exit / TP / SL details
    entries: [{ price: "", allocation: "100" }],
    exits: [{ mode: "price", price: "", percent: "", allocation: "" }],
    tps: [{ mode: "price", price: "", percent: "", allocation: "" }],
    sls: [{ mode: "price", price: "", percent: "", allocation: "" }],

    // 🔹 Other Metadata
    rulesFollowed: false,
    reason: [],
    learnings: "",

    // 🔹 Average Values
    avgEntryPrice: "",
    avgExitPrice: "",
    avgSLPrice: "",
    avgTPPrice: "",

    // 🔹 Timestamps
    openTime: now,
    closeTime: now, // auto-managed based on tradeStatus

    // 🔹 Fees
    feeType: "percent",
    openFeeValue: "",
    closeFeeValue: "",
    openFeeAmount: 0,
    closeFeeAmount: 0,
    feeAmount: 0,
    pnlAfterFee: 0,

    // 🔹 Images
    openImage: null,
    openImagePreview: "",
    closeImage: null,
    closeImagePreview: "",

    // 🔹 Derived Values
    duration: 0,
    rr: "",
    pnl: "",
    expectedProfit: 0,
    expectedLoss: 0,
  });

  // ==============================
  // 🕓 Formatted Time Display
  // ==============================
  const [openTimeFormatted, setOpenTimeFormatted] = useState("");
  const [closeTimeFormatted, setCloseTimeFormatted] = useState("");

  // ==============================
  // 🔄 Handle Trade Status Change
  // ==============================
  useEffect(() => {
    if (form.tradeStatus === "quick") {
      const now = new Date().toISOString();
      setForm((prev) => ({ ...prev, closeTime: now }));
      setCloseTimeFormatted(dayjs(now).format("MMM D, YYYY • HH:mm"));
    } else if (form.tradeStatus === "running") {
      setForm((prev) => ({ ...prev, closeTime: null }));
      setCloseTimeFormatted("");
    }
  }, [form.tradeStatus]);

  // ==============================
  // 📅 Format Open Time Separately
  // ==============================
  useEffect(() => {
    if (form.openTime) {
      setOpenTimeFormatted(dayjs(form.openTime).format("MMM D, YYYY • HH:mm"));
    }
  }, [form.openTime]);

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
        // Exits required for closed trades
        if (!form.exits || form.exits.length === 0 || !form.exits[0].price)
          return "At least one exit is required";

        // ✅ CloseTime required for closed trades
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
    if (form.duration < 0) return "Duration should be positive";

    // ✅ CloseTime can’t be before OpenTime (only if both exist)
    if (form.closeTime && form.openTime) {
      if (new Date(form.closeTime) < new Date(form.openTime)) {
        return "Close date cannot be earlier than Open time";
      }
    }

    return null; // ✅ No errors
  };

  // 🔍 detect edit mode
  const isEdit = router.query.mode === "edit" || router.query.mode === "close";

  useEffect(() => {
    const prefillTrade = async () => {
      if (!isEdit) return;

      const tradeId = localStorage.getItem(TRADE_KEY);
      if (!tradeId) return;

      const userData = await getFromIndexedDB("user-data");
      const tradeData = userData?.trades?.find((t) => t._id === tradeId);
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

      setForm((prev) => ({
        ...prev,
        ...tradeData,
        reason: parsedReason,
        // ✅ Keep the same timestamps as in DB (don’t shift or format new ones)
        openTime: tradeData.openTime || prev.openTime,
        closeTime: tradeData.closeTime || prev.closeTime,
        openImage: null,
        openImagePreview: tradeData.openImageUrl || "",
        closeImage: null,
        closeImagePreview: tradeData.closeImageUrl || "",
      }));

      // ✅ Update formatted display without reformatting timezone
      if (tradeData.openTime)
        setOpenTimeFormatted(
          dayjs(tradeData.openTime).format("MMM D, YYYY • HH:mm")
        );
      if (tradeData.closeTime)
        setCloseTimeFormatted(
          dayjs(tradeData.closeTime).format("MMM D, YYYY • HH:mm")
        );
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
      expectedProfit = (profitPercent / 100) * form.quantityUSD;
    }

    if (avgEntry && avgSL) {
      const lossPercent = ((avgEntry - avgSL) / avgEntry) * 100;
      expectedLoss = (lossPercent / 100) * form.quantityUSD;
    }

    // Risk-Reward Ratio
    let rr = "";
    if (expectedLoss && expectedProfit && expectedLoss !== 0) {
      const rawRR = expectedProfit / Math.abs(expectedLoss);
      rr = `1:${rawRR}`;
    }

    // PnL (only for closed trades, stored as USD)
    let pnl = form.pnl; // keep DB value if not closed
    if (form.tradeStatus === "closed" && avgExit && avgEntry) {
      const pnlPercent =
        form.direction === "long"
          ? ((avgExit - avgEntry) / avgEntry) * 100
          : ((avgEntry - avgExit) / avgEntry) * 100;

      pnl = (pnlPercent / 100) * form.quantityUSD;
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

        if (cachedUser?.accounts?.length > 0) {
          const accountId = Cookies.get("accountId"); // ✅ active account from cookies

          const activeAccount = cachedUser.accounts.find(
            (acc) => acc._id === accountId
          );

          if (activeAccount?.currency) {
            setCurrencySymbol(getCurrencySymbol(activeAccount.currency));
          } else {
            warn("⚠️ No matching account found or missing currency field.");
          }
        } else {
        }
      } catch (err) {}
    };

    fetchAccounts();
  }, []);

  // --- Helpers ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "quantityUSD" || name === "leverage") {
        updated.totalQuantity =
          (Number(updated.quantityUSD) || 0) * (Number(updated.leverage) || 0);
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
    const value = Number(num); // ensure it's a number

    if (isNaN(value)) return "0"; // fallback for invalid numbers

    if (value < 1) {
      return value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    } else {
      return value.toFixed(2);
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

    return totalAlloc > 0 ? weighted / totalAlloc : "";
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
  // 📌 Adjust MAX_IMAGE_SIZE dynamically (fallback if plan not loaded)
  let MAX_IMAGE_SIZE = 5 * 1024 * 1024; // default 5MB fallback

  // 🔹 Convert file to Data URL
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm(form);
    if (validationError) {
      setToast({ type: "error", message: validationError });
      return;
    }

    setLoading(true);
    try {
      const userData = await getFromIndexedDB("user-data");
      const tradeStatus = form.status || "closed"; // can be 'closed', 'running', 'open'

      // ✅ Check trade limit
      const canAdd = await canAddTrade(userData, tradeStatus);
      if (!canAdd) {
        setToast({
          type: "error",
          message:
            tradeStatus === "running"
              ? "Quick trade limit reached for this month."
              : "Trade limit reached for this month.",
        });
        setLoading(false);
        return;
      }

      // ✅ Check image limits if images exist
      if (form.openImage) {
        const sizeMB = form.openImage.size / (1024 * 1024);
        const canUpload = await canUploadImage(userData, sizeMB);
        if (!canUpload) {
          setToast({
            type: "error",
            message: "Image upload limit reached for this month.",
          });
          setLoading(false);
          return;
        }
      }

      if (form.closeImage) {
        const sizeMB = form.closeImage.size / (1024 * 1024);
        const canUpload = await canUploadImage(userData, sizeMB);
        if (!canUpload) {
          setToast({
            type: "error",
            message: "Image upload limit reached for this month.",
          });
          setLoading(false);
          return;
        }
      }

      // ✅ Save serializable form data
      const serializable = {
        ...form,
        openImage: null,
        closeImage: null,
      };

      if (!serializable.closeTime) delete serializable.closeTime;

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

  // 🔹 Handle Image Change (with plan restriction check)
  async function handleImageChange(e, field, setForm) {
    const file = e.target.files[0];
    if (!file) return;

    const userData = await getFromIndexedDB("user-data");

    // ✅ Determine plan-based upload permission
    const canUpload = await canUploadImage(userData, file.size / (1024 * 1024));
    if (!canUpload) {
      setToast({
        type: "error",
        message: "Image size exceeds your plan limit.",
      });

      e.target.value = "";
      return;
    }

    // ✅ Determine dynamic max size per plan
    const rules = userData?.subscription
      ? await import("@/utils/planRestrictions").then((m) =>
          m.getPlanRules(userData)
        )
      : null;

    const planMaxSize = rules?.limits?.maxImageSizeMB || 5;
    MAX_IMAGE_SIZE = planMaxSize * 1024 * 1024;

    if (file.size > MAX_IMAGE_SIZE) {
      setToast({
        type: "error",
        message: "Image size exceeds your plan limit.",
      });
      e.target.value = "";
      return;
    }

    // ✅ Proceed to store
    const previewUrl = URL.createObjectURL(file);
    setForm((prev) => ({
      ...prev,
      [field]: file,
      [`${field}Preview`]: previewUrl,
    }));

    const dataUrl = await fileToDataUrl(file);
    const payload = JSON.stringify({
      dataUrl,
      name: file.name,
      type: file.type,
      ts: Date.now(),
    });

    localStorage.setItem(`newTradeImage_${field}`, payload);
  }

  // 🔹 Handle Image Remove (unchanged)
  function handleImageRemove(field, setForm) {
    setForm((prev) => ({
      ...prev,
      [field]: null,
      [`${field}Preview`]: "",
      [`${field}Removed`]: true,
    }));

    try {
      localStorage.removeItem(`newTradeImage_${field}`);
    } catch (err) {
      console.error(
        `Failed to remove image from localStorage for ${field}`,
        err
      );
    }
  }

  const [activeModal, setActiveModal] = useState(null);

  const openModal = (key) => setActiveModal(key);
  const closeModal = () => setActiveModal(null);

  const modalComponents = {
    quantity: (
      <QuantityGrid
        form={form}
        handleChange={handleChange}
        currencySymbol={currencySymbol}
      />
    ),
    entries: (
      <EntriesSection
        form={form}
        setForm={setForm}
        currencySymbol={currencySymbol}
        formatPrice={formatPrice}
        formatNumber={formatNumber}
        handleAllocationBlur={handleAllocationBlur}
      />
    ),
    exits: (
      <ExitsSection
        form={form}
        setForm={setForm}
        currencySymbol={currencySymbol}
        handleExitAllocationBlur={handleExitAllocationBlur}
        calcPriceFromPercent={calcPriceFromPercent}
        formatPrice={formatPrice}
        formatNumber={formatNumber}
      />
    ),
    stoploss: (
      <StopLossSection
        form={form}
        setForm={setForm}
        calcPriceFromPercent={calcPriceFromPercent}
        formatPrice={formatPrice}
        currencySymbol={currencySymbol}
        handleSLAllocationBlur={handleSLAllocationBlur}
      />
    ),
    takeprofit: (
      <TakeProfitSection
        form={form}
        setForm={setForm}
        calcPriceFromPercent={calcPriceFromPercent}
        formatPrice={formatPrice}
        currencySymbol={currencySymbol}
        handleTPAllocationBlur={handleTPAllocationBlur}
      />
    ),
    opentime: (
      <DateTimeImageSection
        label="Open Time"
        dateValue={form.openTime}
        onDateChange={(date) =>
          setForm((prev) => ({ ...prev, openTime: date }))
        }
        imagePreview={form.openImagePreview}
        onImageChange={(e) => handleImageChange(e, "openImage", setForm)}
        onRemove={() => handleImageRemove("openImage", setForm)}
      />
    ),
    closetime: (
      <DateTimeImageSection
        label="Close Time"
        dateValue={form.closeTime}
        onDateChange={(date) =>
          setForm((prev) => ({ ...prev, closeTime: date }))
        }
        imagePreview={form.closeImagePreview}
        onImageChange={(e) => handleImageChange(e, "closeImage", setForm)}
        onRemove={() => handleImageRemove("closeImage", setForm)}
      />
    ),
    rules: (
      <ToggleSwitch
        label="Rules"
        value={form.rulesFollowed}
        onToggle={() =>
          setForm((prev) => ({
            ...prev,
            rulesFollowed: !prev.rulesFollowed,
          }))
        }
      />
    ),
    reason: (
      <ReasonSelector
        label="Reason"
        name="reason"
        value={form.reason}
        onChange={handleChange}
      />
    ),
    learnings: (
      <TextAreaField
        label="Learnings"
        name="learnings"
        value={form.learnings}
        onChange={handleChange}
        placeholder="What did you learn from this trade?"
      />
    ),
  };

  // 🧠 Determine which modal buttons to show
  const tradeStatus = form.tradeStatus?.toLowerCase();

  let hiddenKeys = [];
  if (tradeStatus === "running") hiddenKeys = ["exits", "closetime"];
  else if (tradeStatus === "closed") hiddenKeys = ["stoploss", "takeprofit"];
  else if (tradeStatus === "quick")
    hiddenKeys = [
      "stoploss",
      "takeprofit",
      "entries",
      "exits",
      "opentime",
      "closetime",
    ];
  const [showDetails, setShowDetails] = useState(false);

  const OtherFactors = ({ form, openModal }) => (
    <div className="boxBg">
      <div className="cardHeader flexRow flexRow_stretch">
        <span className="font_16 font_weight_600">Other Factors</span>
      </div>

      <div className="cardContent flexClm gap_24">
        {/* Rules */}
        <div className="flexRow flexRow_stretch">
          <span className="font_16">Rules Followed:</span>
          <button
            className="button_ter_icon flexRow gap_4 font_16"
            onClick={() => openModal("rules")}
          >
            {form.rulesFollowed ? "Yes" : "No"}
            <Edit3 size={12} className="vector" />
          </button>
        </div>

        {/* Reason */}
        <div className="flexRow flexRow_stretch">
          <span className="font_16">Reasons: </span>
          <button
            className="button_ter_icon flexRow gap_4 font_16"
            onClick={() => openModal("reason")}
          >
            {form.reason?.length
              ? form.reason.join(", ")
              : "No reasons selected"}
            <Edit3 size={12} className="vector" />
          </button>
        </div>

        {/* Learnings */}
        <div className="flexRow flexRow_stretch">
          <span className="font_16">Learnings:</span>
          <button
            className="button_ter_icon flexRow gap_4 font_16"
            onClick={() => openModal("learnings")}
          >
            {form.learnings || "Not added"}
            <Edit3 size={12} className="vector" />
          </button>
        </div>
      </div>
    </div>
  );

  const DateAndImages = ({
    form,
    openModal,
    openTimeFormatted,
    closeTimeFormatted,
  }) => {
    return (
      <div className="summaryBlock flexClm gap_16">
        {/* ================= 🟩 OPEN TIME & IMAGE ================= */}
        <div className="boxBg setupCard">
          {/* Header */}
          <div className="cardHeader">
            <div className="cardTitle">
              <span className="font_16 font_weight_600">Open Time & Image</span>
            </div>
          </div>

          {/* Content */}
          <div className="cardContent">
            <div className="setupInfo">
              <div className="imageSection flexClm gap_12">
                {/* Time */}
                <div className="boxBg flexRow flexRow_stretch font_14">
                  <div className="flexRow gap_4 flex_center">
                    <Calendar size={14} className="icon" />
                    <span className="timeText">
                      {openTimeFormatted || "Not set"}
                    </span>
                  </div>

                  <button
                    className="button_ter_icon"
                    onClick={() => openModal("opentime")}
                    title="Edit Open Details"
                  >
                    <Edit3 size={12} className="vector" />
                  </button>
                </div>

                {/* Image */}
                {form.openImagePreview ? (
                  <div className="preview">
                    <img
                      src={form.openImagePreview}
                      alt="Open snapshot"
                      className="imagePreview"
                    />
                  </div>
                ) : (
                  <button
                    className="button_sec flexRow _12"
                    style={{ maxWidth: "fit-content" }}
                    onClick={() => openModal("opentime")}
                  >
                    <Plus size={20} className="icon" />
                    <span>Add trade snapshot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= 🟥 CLOSE TIME & IMAGE (if not running) ================= */}
        {form.tradeStatus !== "running" && (
          <div className="boxBg setupCard">
            {/* Header */}
            <div className="cardHeader">
              <div className="cardTitle">
                <span className="font_16 font_weight_600">
                  Close Time & Image
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="cardContent">
              <div className="setupInfo">
                <div className="imageSection flexClm gap_12">
                  {/* Time */}
                  <div className="boxBg flexRow flexRow_stretch font_14">
                    <div className="flexRow gap_4 flex_center">
                      <Calendar size={14} className="icon" />
                      <span className="timeText">
                        {closeTimeFormatted || "Not set"}
                      </span>
                    </div>

                    <button
                      className="button_ter_icon"
                      onClick={() => openModal("closetime")}
                      title="Edit Close Details"
                    >
                      <Edit3 size={12} className="vector" />
                    </button>
                  </div>

                  {/* Image */}
                  {form.closeImagePreview ? (
                    <div className="preview">
                      <img
                        src={form.closeImagePreview}
                        alt="Close snapshot"
                        className="imagePreview"
                      />
                    </div>
                  ) : (
                    <button
                      className="button_sec flexRow _12"
                      style={{ maxWidth: "fit-content" }}
                      onClick={() => openModal("closetime")}
                    >
                      <Plus size={20} className="icon" />
                      <span>Add trade snapshot</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flexClm gap_32" style={{ paddingBottom: "100px" }}>
      <div className="flexClm gap_4">
        <span className="font_20">Log trade</span>
        <span className="font_12 shade_60">Log trade in seconds</span>
      </div>

      <form onSubmit={handleSubmit} className="flexClm gap_24">
        {/* 1️⃣ Trade Status */}
        <TradeStatusGrid
          form={form}
          handleChange={handleChange}
          statuses={statuses}
        />

        <hr width="100" color="grey" />

        {/* 2️⃣ Ticker */}
        <Ticker form={form} setForm={setForm} handleChange={handleChange} />

        {/* 3️⃣ Conditional Sections */}
        {tradeStatus === "quick" && (
          <>
            <QuickSection
              form={form}
              setForm={setForm}
              currency={currencySymbol}
              handleChange={handleChange}
            />
          </>
        )}

        {tradeStatus === "closed" && (
          <QuickSection
            form={form}
            setForm={setForm}
            currency={currencySymbol}
            handleChange={handleChange}
          />
        )}
      </form>

      {/* 🧾 Trade Summary Section */}
      {["running", "closed", "quick"].includes(tradeStatus) && (
        <div className="summarySection flexClm gap_20">
          {/* ===================== 🟩 RUNNING TRADES ===================== */}
          {tradeStatus === "running" && (
            <motion.div
              className="flexClm gap_16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {" "}
              {/* 2️⃣ Position Summary */}
              <div className="boxBg positionCard">
                <div className="cardHeader flexRow flexRow_stretch">
                  <div className="cardTitle">
                    <span className="font_16 font_weight_600">
                      Set position size
                    </span>
                  </div>
                  <button
                    className="button_ter_icon"
                    onClick={() => openModal("quantity")}
                    title="Edit Position"
                  >
                    <Edit3 size={12} className="vector" />
                  </button>
                </div>

                <div className="cardContent">
                  <div className="positionMetrics flexRow flexRow_stretch font_14">
                    <div className="metricBox flexClm gap_4">
                      <span className="metricLabel">Margin</span>
                      <span className="metricValue">
                        {form.totalQuantity || 0}
                      </span>
                    </div>
                    <div className="metricBox flexClm gap_4">
                      <span className="metricLabel">Leverage</span>
                      <span className="metricValue">{form.leverage || 1}x</span>
                    </div>

                    <div className="metricBox flexClm gap_4">
                      <span className="metricLabel">Total Margin</span>
                      <span className="metricValue">
                        {(form.quantityUSD || 0) * (form.leverage || 1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* 1️⃣ Strategy & Targets */}
              <div className="boxBg strategyCard">
                <div className="cardHeader">
                  <div className="cardTitle">
                    <span className="font_16 font_weight_600">
                      Set entries & targets
                    </span>
                  </div>
                </div>

                <div className="cardContent">
                  <div className="flexRow flexRow_stretch">
                    <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Entry Price</span>
                        <button
                          className="button_ter_icon"
                          onClick={() => openModal("entries")}
                          title="Edit Entries"
                        >
                          <Edit3 size={12} className="vector" />
                        </button>
                      </div>

                      <span className="metricValue primary">
                        {form.entries
                          ?.map((e) => formatPrice(e.price))
                          .join(", ") || "0.00"}
                      </span>
                    </div>
                    {/* Take Profit */}
                    <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Take Profit</span>
                        <button
                          className="button_ter_icon"
                          onClick={() => openModal("takeprofit")}
                          title="Edit Take Profit"
                        >
                          <Edit3 size={12} className="vector" />
                        </button>
                      </div>

                      <span className="metricValue success">
                        {form.avgTPPrice || 0}
                      </span>
                    </div>

                    {/* Stop Loss */}
                    <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Stop Loss</span>
                        <button
                          className="button_ter_icon"
                          onClick={() => openModal("stoploss")}
                          title="Edit Stop Loss"
                        >
                          <Edit3 size={12} className="vector" />
                        </button>
                      </div>

                      <span className="metricValue error">
                        {form.avgSLPrice || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {/* 2️⃣ Risk Management */}
              <div className="boxBg riskCard">
                <div className="cardContent">
                  <div className="riskMetrics">
                    <div className="riskRow flexRow flexRow_stretch font_14">
                      <div className="metricBox flexClm gap_4">
                        <span className="metricLabel">Expected Profit</span>
                        <span className="metricValue success">
                          {form.expectedProfit || 0}
                        </span>
                      </div>
                      <div className="metricBox flexClm gap_4">
                        <span className="metricLabel">Expected Loss</span>
                        <span className="metricValue error">
                          {form.expectedLoss || 0}
                        </span>
                      </div>
                      {/* <div className="metricBox flexClm gap_4">
                        <span className="metricLabel">Estimated Fees</span>
                        <span className="metricValue warning">
                          {form.feeAmount || 0}
                        </span>
                      </div> */}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== 🟦 CLOSED TRADES ===================== */}
          {tradeStatus === "closed" && (
            <motion.div
              className="flexClm gap_16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {/* 2️⃣ Position Summary */}
              <div className="boxBg positionCard">
                <div className="cardHeader flexRow flexRow_stretch">
                  <div className="cardTitle">
                    <span className="font_16 font_weight_600">
                      Set position size
                    </span>
                  </div>
                  <button
                    className="button_ter_icon"
                    onClick={() => openModal("quantity")}
                    title="Edit Position"
                  >
                    <Edit3 size={12} className="vector" />
                  </button>
                </div>

                <div className="cardContent">
                  <div className="positionMetrics flexRow flexRow_stretch font_14">
                    <div className="metricBox flexClm gap_4">
                      <span className="metricLabel">Margin</span>
                      <span className="metricValue">
                        {form.totalQuantity || 0}
                      </span>
                    </div>
                    <div className="metricBox flexClm gap_4">
                      <span className="metricLabel">Leverage</span>
                      <span className="metricValue">{form.leverage || 1}x</span>
                    </div>

                    <div className="metricBox flexClm gap_4">
                      <span className="metricLabel">Total Margin</span>
                      <span className="metricValue">
                        {(form.quantityUSD || 0) * (form.leverage || 1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1️⃣ Trade Performance */}
              <div className="boxBg performanceCard">
                <div className="cardContent">
                  <div className="flexRow flexRow_stretch">
                    {/* Average Entry */}
                    <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Average Entry</span>
                        <button
                          className="button_ter_icon flexRow gap_4"
                          onClick={() => openModal("entries")}
                          title="Edit Entries"
                        >
                          <Edit3 size={14} className="vector" />
                        </button>
                      </div>
                      <span className="metricValue primary">
                        {formatPrice(form.avgEntryPrice || 0)}
                      </span>
                    </div>

                    {/* Average Exit */}
                    <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Average Exit</span>
                        <button
                          className="button_ter_icon flexRow gap_4"
                          onClick={() => openModal("exits")}
                          title="Edit Entries"
                        >
                          <Edit3 size={14} className="vector" />
                        </button>
                      </div>
                      <span className="metricValue primary">
                        {formatPrice(form.avgExitPrice || 0)}
                      </span>
                    </div>

                    {/* Gross P&L */}
                    <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Gross P&L</span>
                      </div>
                      <span
                        className={`metricValue ${
                          form.pnl >= 0 ? "success" : "error"
                        }`}
                      >
                        {formatPrice(form.pnl || 0)}
                      </span>
                    </div>

                    {/* Fees */}
                    {/* <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Fees</span>
                        <DollarSign size={14} className="warning" />
                      </div>
                      <span className="metricValue warning">
                        -{formatPrice(form.feeAmount || 0)}
                      </span>
                    </div> */}

                    {/* Net P&L */}
                    {/* <div className="metricItem">
                      <div className="flexRow gap_4 font_14">
                        <span className="metricLabel">Net P&L</span>
                      </div>
                      <span
                        className={`metricValue ${
                          form.pnlAfterFee >= 0 ? "success" : "error"
                        }`}
                      >
                        {formatPrice(form.pnlAfterFee || 0)}
                      </span>
                    </div> */}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== 🟨 QUICK TRADES ===================== */}
          <div className="flexClm gap_16">
            {/* Toggle Button */}
            <button
              className="button_sec flexRow gap_4"
              onClick={() => setShowDetails((prev) => !prev)}
            >
              {showDetails ? (
                <>
                  <ChevronUp size={16} />
                  Hide Other Details
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Add dates, tags, snaps & more..
                </>
              )}
            </button>

            {/* Slide-down details */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  className="flexClm gap_16"
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {/* 2️⃣ Trade Timeline */}
                  <DateAndImages
                    form={form}
                    openModal={openModal}
                    openTimeFormatted={openTimeFormatted}
                    closeTimeFormatted={closeTimeFormatted}
                  />

                  {/* 3️⃣ Quick Notes */}
                  <OtherFactors form={form} openModal={openModal} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ✅ Submit & Cancel */}
      <div
        className="popups_btm"
        style={{
          width: "98%",
          backdropFilter: "blur(20px)",
          bottom: "0px",
          padding: "0 12px 12px 12px",
        }}
      >
        {/* <span className="font_12 shade_50">Choose other factors</span> */}
        {/* 🔘 Bottom Buttons for opening modals */}
        {/* {visibleButtons.length > 0 && (
          <div
            className="flexRow gap_12 flexRow_scroll removeScrollBar"
            style={{ padding: "16px 0" }}
          >
            {visibleButtons.map((key) => (
              <button
                key={key}
                className="button_sec"
                onClick={() => openModal(key)}
              >
                {key
                  .replace(/([A-Z])/g, " $1")
                  .replace(/^./, (s) => s.toUpperCase())}
              </button>
            ))}
          </div>
        )} */}
        <div className="flexRow flexRow_stretch gap_4">
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
            disabled={loading}
          >
            {loading
              ? "⏳ Please wait..."
              : isEdit
              ? "Update log"
              : "Submit log"}
          </button>
        </div>
      </div>

      {/* 🔄 Toast + Loader */}
      {toast && (
        <ToastMessage
          type={toast.type}
          message={toast.message}
          duration={3000}
        />
      )}
      {loading && <FullPageLoader />}

      {/* 🪟 Active Modal */}
      {activeModal && (
        <ModalWrapper onClose={closeModal}>
          <div className="modal_inner flexClm gap_16">
            {modalComponents[activeModal]}
          </div>
        </ModalWrapper>
      )}
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
