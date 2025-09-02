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

const TRADE_KEY = "__t_rd_iD";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AddTrade() {
  const router = useRouter();
  const firstExitRef = useRef(null);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const [activeGrid, setActiveGrid] = useState(null);

  const statuses = [
    { value: "running", label: "Running" },
    { value: "closed", label: "Closed" },
    { value: "quick", label: "Quick" },
  ];

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
    reason: "",
    learnings: "",
    avgEntryPrice: "",
    avgExitPrice: "",
    avgSLPrice: "",
    avgTPPrice: "",
    openTime: getLocalDateTime(), // current local datetime
    closeTime: getLocalDateTime(), // current local datetime

    // Images
    openImage: null,
    openImagePreview: "",
    closeImage: null,
    closeImagePreview: "",

    // Derived values
    duration: 0,
    rr: "",
    pnl: 0,
    expectedProfit: 0,
    expectedLoss: 0,
  });

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
        setForm({
          ...form,
          ...tradeData,
          // Convert ISO dates → datetime-local format
          openTime: tradeData.openTime
            ? getLocalDateTime(new Date(tradeData.openTime))
            : getLocalDateTime(),
          closeTime: tradeData.closeTime
            ? getLocalDateTime(new Date(tradeData.closeTime))
            : getLocalDateTime(),
          // Images
          openImage: null, // will only set new if user uploads
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

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

  function handleImageChange(e, field, setForm) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      alert("❌ Image size cannot exceed 5MB.");
      e.target.value = ""; // reset input
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setForm((prev) => ({
      ...prev,
      [field]: file, // e.g. openImage / closeImage
      [`${field}Preview`]: previewUrl, // e.g. openImagePreview / closeImagePreview
    }));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (
          key === "openImage" ||
          key === "closeImage" ||
          key === "openImagePreview" ||
          key === "closeImagePreview"
        )
          return;

        if (Array.isArray(value) || typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value);
        }
      });

      if (form.openImage) {
        formData.append("openImage", form.openImage);
      }
      if (form.closeImage) {
        formData.append("closeImage", form.closeImage);
      }

      let res;
      if (isEdit) {
        const tradeId = localStorage.getItem(TRADE_KEY);
        res = await axios.put(
          `${API_BASE}/api/trades/update/${tradeId}`,
          formData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
      } else {
        res = await axios.post(`${API_BASE}/api/trades/addd`, formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      if (res.data.success) {
        const { accounts, trades } = res.data;

        console.log("💾 Syncing updated data into IndexedDB:", {
          accountsCount: accounts?.length || 0,
          tradesCount: trades?.length || 0,
        });

        await saveToIndexedDB("user-data", {
          userId: localStorage.getItem("userId"),
          accounts,
          trades,
        });

        alert(
          isEdit ? "Trade updated successfully!" : "Trade added successfully!"
        );
      }
    } catch (err) {
      console.error(err);
      alert(isEdit ? "Error updating trade" : "Error adding trade");
    }
  };

  useEffect(() => {
    if (activeGrid) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [activeGrid]);

  const grids = [
    {
      key: "ticker",
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
        <EntriesSection
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
          label="Rules Followed"
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
        <TextAreaField
          label="Reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Write your reason here..."
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

  return (
    <div className="flexClm gap_32">
      <Navbar />
      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="flexClm gap_24">
          {grids.map(({ key, content }) => (
            <div key={key} onClick={() => setActiveGrid(key)}>
              {content}
            </div>
          ))}
        </div>
        {activeGrid && (
          <div className="overlay">
            <div className="modal">
              <button className="closeBtn" onClick={() => setActiveGrid(null)}>
                <X size={20} />
              </button>
              {grids.find((g) => g.key === activeGrid)?.content}
            </div>
          </div>
        )}

        <BackgroundBlur />
      </form>

      <div
        className="popups_btm flexRow flexRow_stretch gap_4"
        style={{
          width: "90%",
          backdropFilter: "blur(20px)",
          padding: "8px 8px",
        }}
      >
        <button className="button_sec" onClick={() => router.push("/trade")}>
          <ArrowLeftCircle size={20} />
        </button>
        <button
          className="button_pri"
          style={{ width: "100%" }}
          onClick={handleSubmit}
        >
          {isEdit ? "✏️ Update Trade" : "Submit Trade"}
        </button>
      </div>

      {/* Summary Section */}
      {/* <div style={{ marginTop: "2rem" }}>
                <h3>Trade Setup Summary</h3>

               
                <pre style={{ background: "#f4f4f4", padding: "1rem", borderRadius: "8px" }}>
                    {JSON.stringify({
                        ...form,
                        avgEntryPrice: form.avgEntryPrice,
                    }, null, 2)}
                </pre>

               
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
