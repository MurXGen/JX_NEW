import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";
import { saveToIndexedDB } from '@/utils/indexedDB';
import { getFromIndexedDB } from "@/utils/indexedDB";
import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatNumber } from "@/utils/formatNumbers"; // 
import Navbar from "@/components/Auth/Navbar";
import { ArrowDownRight, ArrowLeftCircle, ArrowUpRightIcon, Check, Upload, X } from "lucide-react";
import BackgroundBlur from "@/components/ui/BackgroundBlur";
import DateTimePicker from "@/components/ui/DateTimePicker";

const TRADE_KEY = "__t_rd_iD";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function AddTrade() {
    const router = useRouter();
    const firstExitRef = useRef(null);
    const [currencySymbol, setCurrencySymbol] = useState("$");

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
                firstExitRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
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
                        console.warn("⚠️ No matching account found or missing currency field.");
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
                price = Number(calcPriceFromPercent(avgEntryPrice, x.percent, direction));
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

            const avg =
                totalWeight > 0 ? weightedSum / totalWeight : "";

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
                        ? calcPriceFromPercent(form.avgEntryPrice
                            , e.percent, prev.direction)
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

            const totalAllocated = sls.reduce((sum, sl) => sum + Number(sl.allocation || 0), 0);
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
                        form.avgEntryPrice
                        ,
                        percentNum,   // <-- negative keeps it below, positive adds above
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

            const avgSLPrice = totalWeight > 0 ? formatPrice(weightedSum / totalWeight) : "";

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

            const totalAllocated = tps.reduce((sum, tp) => sum + Number(tp.allocation || 0), 0);
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
                        ? calcPriceFromPercent(form.avgEntryPrice
                            , t.percent, prev.direction)
                        : t.price;

                const priceNum = Number(tpPrice);
                const alloc = Number(t.allocation);

                if (priceNum > 0 && alloc > 0) {
                    weightedSum += priceNum * (alloc / 100);
                    totalWeight += alloc / 100;
                }
            });

            const avgTPPrice = totalWeight > 0 ? formatPrice(weightedSum / totalWeight) : "";

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
            [field]: file,                 // e.g. openImage / closeImage
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
                ) return;

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
                res = await axios.post(
                    `${API_BASE}/api/trades/addd`,
                    formData,
                    {
                        withCredentials: true,
                        headers: { "Content-Type": "multipart/form-data" },
                    }
                );
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

                alert(isEdit ? "Trade updated successfully!" : "Trade added successfully!");
            }
        } catch (err) {
            console.error(err);
            alert(isEdit ? "Error updating trade" : "Error adding trade");
        }
    };

    return (
        <div className="flexClm gap_32">
            <Navbar />
            <form onSubmit={handleSubmit}>
                {/* Basic Info */}
                <div className="flexClm gap_24">
                    <div className="tradeGrid">
                        <span className="label">Ticker name</span>
                        <div className="inputLabelShift">
                            <input name="symbol" value={form.symbol} onChange={handleChange} placeholder="Ticker name" />
                            <label>Ticker name</label>
                        </div>
                        <div className="flexRow flexRow_stretch gap_12" style={{ width: '100%' }}>
                            <div
                                className={`toggleOption button_sec flexRow flex_center ${form.direction === "long" ? "success" : ""}`}
                                style={{ width: '100%' }}
                                onClick={() => setForm({ ...form, direction: "long" })}
                            >
                                Long <ArrowUpRightIcon size={20} />
                            </div>
                            <div
                                className={`toggleOption button_sec flexRow flex_center ${form.direction === "short" ? "error" : ""}`}
                                style={{ width: '100%' }}
                                onClick={() => setForm({ ...form, direction: "short" })}
                            >
                                Short <ArrowDownRight size={20} />
                            </div>
                        </div>

                    </div>



                    <div className="tradeGrid">
                        <span className="label">Quantity</span>
                        <div className="flexClm gap_12">
                            <div className="flexRow flexRow_stretch gap_12">
                                <div className="inputLabelShift">
                                    <input
                                        type="number"
                                        name="quantityUSD"
                                        placeholder="Margin"
                                        value={form.quantityUSD}
                                        onChange={handleChange}
                                        required
                                    />
                                    <label>Margin</label>
                                </div>

                                <div className="inputLabelShift">
                                    <input
                                        type="number"
                                        name="leverage"
                                        value={form.leverage}
                                        onChange={handleChange}
                                        placeholder="Leverage"
                                    />
                                    <label>Leverage</label>
                                </div>
                            </div>

                            <span className="valueDisplay flexRow flex_center"> Total value :   {currencySymbol} {form.totalQuantity}</span>
                        </div>

                    </div>

                    {/* Trade Status */}
                    <div className="tradeGrid">
                        <span className="label">Trade Status</span>
                        <div className="flexRow flexRow_stretch gap_12">
                            {statuses.map((status) => (
                                <button
                                    key={status.value}
                                    type="button"
                                    className={`button_sec width100 ${form.tradeStatus === status.value ? "selected" : ""
                                        }`}
                                    onClick={() =>
                                        handleChange({
                                            target: { name: "tradeStatus", value: status.value },
                                        })
                                    }
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Entries (for Closed or Running setup) */}
                    {(form.tradeStatus === "closed" || form.tradeStatus === "running") && (
                        <div className="tradeGrid" style={{ padding: "0 0 32px 0" }}>
                            <div className="label">
                                <span>Entries</span>
                            </div>

                            <div className="flexClm gap_32">
                                {form.entries.map((entry, idx) => {
                                    const usedAllocation = form.entries.reduce(
                                        (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
                                        0
                                    );
                                    const remaining = Math.max(0, 100 - usedAllocation);
                                    const allocatedValue = ((entry.allocation || 0) / 100) * form.totalQuantity;

                                    return (
                                        <div key={idx} className="flexRow flexRow_stretch gap_12">
                                            {/* Entry Price Input */}
                                            <div className="flexClm" style={{ flex: '1' }}>
                                                <div className="inputLabelShift">
                                                    <input
                                                        type="number"
                                                        step="any"
                                                        name={`entryPrice_${idx}`}
                                                        value={entry.price}
                                                        placeholder="Entry Price"
                                                        min="0"
                                                        onChange={(e) => {
                                                            let val = Number(e.target.value);
                                                            if (val < 0) val = 0;

                                                            const entries = [...form.entries];
                                                            entries[idx].price = val;
                                                            setForm({ ...form, entries });

                                                            // recalc weighted average price
                                                            let weightedSum = 0;
                                                            let totalWeight = 0;
                                                            entries.forEach((en) => {
                                                                const price = Number(en.price);
                                                                const alloc = Number(en.allocation);
                                                                if (price > 0 && alloc > 0) {
                                                                    weightedSum += price * (alloc / 100);
                                                                    totalWeight += alloc / 100;
                                                                }
                                                            });
                                                            const avg = totalWeight > 0 ? weightedSum / totalWeight : "";
                                                            const avgPrice = avg !== "" ? formatPrice(avg) : "";
                                                            setForm((prev) => ({
                                                                ...prev,
                                                                avgEntryPrice: avgPrice,
                                                            }));
                                                        }}
                                                    />
                                                    <label>Entry Price</label>
                                                </div>
                                                <div className="font_12" style={{ position: 'relative' }}>
                                                    {form.avgEntryPrice && (
                                                        <span style={{ position: 'absolute', bottom: '-20px', right: '1px' }}>
                                                            Avg. Entry:           {formatNumber(form.avgEntryPrice, 2)}

                                                        </span>
                                                    )}
                                                </div>

                                            </div>


                                            {/* Allocation Input */}
                                            <div className="flexClm" style={{ flex: '1' }}>
                                                <div className="inputLabelShift">
                                                    <input
                                                        type="number"
                                                        name={`allocation_${idx}`}
                                                        placeholder="Allocation %"
                                                        value={entry.allocation}
                                                        min="0"
                                                        max={remaining}
                                                        disabled={!entry.price || Number(entry.price) <= 0}
                                                        onChange={(e) => {
                                                            const entries = [...form.entries];
                                                            let val = Number(e.target.value);

                                                            // clamp between 0 and remaining
                                                            if (val > remaining) val = remaining;
                                                            if (val < 0) val = 0;

                                                            entries[idx].allocation = val;
                                                            setForm({ ...form, entries });
                                                        }}
                                                        onBlur={(e) => handleAllocationBlur(idx, e.target.value)}
                                                    />
                                                    <label>Allocation %</label>
                                                </div>

                                                {/* Allocation Info */}
                                                <div className="font_12" style={{ position: "relative" }}>
                                                    <span style={{ position: "absolute", bottom: "-20px", right: "1px" }}>
                                                        Allocated:{" "}
                                                        {currencySymbol}
                                                        {formatNumber(allocatedValue, 2)}
                                                    </span>
                                                </div>
                                            </div>

                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Exits (for Closed setup) */}
                    {form.tradeStatus === "closed" && (
                        <div className="tradeGrid" style={{ padding: "0 0 12px 0" }}>
                            <span className="label">Exits</span>
                            <div className="flexClm gap_32">


                                <div className="flexClm gap_32">
                                    {form.exits.map((exit, idx) => {
                                        const exitMode = exit.mode || "price";
                                        const exitPrice =
                                            exitMode === "percent"
                                                ? calcPriceFromPercent(Number(form.avgEntryPrice) || 0, Number(exit.percent) || 0, form.direction)
                                                : exit.price;

                                        const usedOther = form.exits.reduce(
                                            (sum, e, i) => (i !== idx ? sum + Number(e.allocation || 0) : sum),
                                            0
                                        );
                                        const remaining = Math.max(0, 100 - usedOther);

                                        return (
                                            <div key={idx} className="flexClm gap_32">
                                                <div className="flexRow flexRow_stretch gap_4">
                                                    <div className="inputLabelShift">
                                                        {exitMode === "price" ? (
                                                            <div className="inputLabelShift">
                                                                <input
                                                                    ref={idx === 0 ? firstExitRef : null}
                                                                    type="number"
                                                                    step="any"
                                                                    min="0"
                                                                    placeholder="Exit Price"
                                                                    value={exit.price ?? ""}
                                                                    onChange={(e) => {
                                                                        let val = Number(e.target.value);
                                                                        if (val < 0) val = 0;
                                                                        updateExit(idx, "price", val);
                                                                    }}
                                                                />
                                                                <label>Exit price</label>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div className="inputLabelShift" style={{ position: 'relative' }}>
                                                                    <input
                                                                        ref={idx === 0 ? firstExitRef : null}
                                                                        type="number"
                                                                        step="any"
                                                                        placeholder="Enter % away from entry"
                                                                        value={exit.percent ?? ""}
                                                                        onChange={(e) => {
                                                                            let val = Number(e.target.value);
                                                                            if (form.direction === "long" && val < -100) val = -100;
                                                                            if (form.direction === "short" && val > 100) val = 100;
                                                                            updateExit(idx, "percent", val);
                                                                        }}

                                                                    />
                                                                    <label>Enter % away from entry </label>
                                                                </div>

                                                                <span className="font_12" style={{ position: 'absolute', bottom: '-20px', right: '1px' }}>Exit Price: {exitPrice ? formatPrice(Number(exitPrice)) : '0'}</span>
                                                            </div>

                                                        )}
                                                    </div>
                                                    <div className="flexRow gap_4">
                                                        <button
                                                            type="button"
                                                            className={`button_sec icon-wrapper ${exit.mode === "price" ? "active" : ""}`}
                                                            onClick={() => updateExit(idx, "mode", "price")}
                                                        >
                                                            {currencySymbol}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`button_sec icon-wrapper ${exit.mode === "percent" ? "active" : ""}`}
                                                            onClick={() => updateExit(idx, "mode", "percent")}
                                                        >
                                                            %
                                                        </button>
                                                    </div>


                                                </div>

                                                <div className="inputLabelShift">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        placeholder="Allocation %"
                                                        value={exit.allocation ?? 0}
                                                        disabled={
                                                            (!exit.price || Number(exit.price) <= 0) &&
                                                            (!exit.percent || exit.percent === "")
                                                        }
                                                        onChange={(e) => {
                                                            let val = Number(e.target.value);
                                                            if (val < 0) val = 0;
                                                            if (val > remaining) val = remaining;
                                                            updateExit(idx, "allocation", val);
                                                        }}
                                                        onBlur={(e) => handleExitAllocationBlur(idx, e.target.value)}
                                                    />
                                                    <label>Allocation in &</label>
                                                    <div className="font_12" style={{ position: "relative" }}>
                                                        <span style={{ position: "absolute", bottom: "-20px", right: "1px" }}>
                                                            Allocated:{" "}
                                                            {currencySymbol}
                                                            {formatNumber(((exit.allocation || 0) / 100) * (form.totalQuantity || 0).toFixed(2))}

                                                        </span>
                                                    </div>

                                                </div>


                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Show weighted average exit price */}
                                {form.avgExitPrice && (
                                    <span className="valueDisplay flexRow flex_center">
                                        Average Exit Price: {form.avgExitPrice}
                                    </span>
                                )}

                            </div>
                        </div>
                    )}

                    {/* Quick Section */}
                    {form.tradeStatus === "quick" && (
                        <div className="tradeGrid" style={{ padding: "0 0 32px 0" }}>
                            <span className="label">Net Profit or Loss</span>
                            <input
                                type="number"
                                name="pnl"
                                value={form.pnl || ""}
                                onChange={handleChange}
                            />
                        </div>
                    )}

                    {/* SL Section (Running Trades) */}
                    {form.tradeStatus === "running" && (
                        <div className="tradeGrid" style={{ padding: "0 0 24px 0" }}>
                            <span className="label">Stop Loss</span>
                            <div className="flexClm gap_32">
                                {form.sls.map((sl, idx) => {
                                    const entryPrice = form.avgEntryPrice || form.entries[0]?.price;

                                    const slPrice =
                                        sl.mode === "percent"
                                            ? calcPriceFromPercent(entryPrice, sl.percent, form.direction)
                                            : sl.price;

                                    const usedOther = form.sls.reduce(
                                        (sum, s, i) => (i !== idx ? sum + Number(s.allocation || 0) : sum),
                                        0
                                    );
                                    const remaining = Math.max(0, 100 - usedOther);

                                    return (
                                        <div key={idx} className="flexClm gap_32">
                                            <div className="flexRow flexRow_stretch gap_4">
                                                <div className="inputLabelShift">
                                                    {sl.mode === "price" ? (
                                                        <div className="inputLabelShift">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                placeholder="SL Price"
                                                                value={sl.price ?? ""}
                                                                onChange={(e) => {
                                                                    let val = Math.abs(Number(e.target.value));
                                                                    if (isNaN(val)) val = "";
                                                                    const sls = [...form.sls];
                                                                    sls[idx].price = val;
                                                                    setForm({ ...form, sls });
                                                                }}
                                                            />
                                                            <label>SL Price</label>
                                                        </div>
                                                    ) : (
                                                        <div className="inputLabelShift">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                placeholder="SL %"
                                                                value={sl.percent ?? ""}
                                                                onChange={(e) => {
                                                                    let val = Number(e.target.value);
                                                                    if (form.direction === "long" && val < -100) val = -100;
                                                                    if (form.direction === "short" && val > 100) val = 100;
                                                                    const sls = [...form.sls];
                                                                    sls[idx].percent = isNaN(val) ? "" : val;
                                                                    setForm({ ...form, sls });
                                                                }}
                                                            />
                                                            <label>SL %</label>
                                                            <div className="font_12" style={{ position: "relative" }}>
                                                                <span style={{ position: "absolute", bottom: "-20px", right: "1px" }}>
                                                                    SL Price: {slPrice ? formatPrice(Number(slPrice)) : "0"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flexRow gap_4">
                                                    <button
                                                        type="button"
                                                        className={`button_sec icon-wrapper ${sl.mode === "price" ? "active" : ""}`}
                                                        onClick={() => {
                                                            const sls = [...form.sls];
                                                            sls[idx].mode = "price";
                                                            setForm({ ...form, sls });
                                                        }}
                                                    >
                                                        {currencySymbol}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`button_sec icon-wrapper ${sl.mode === "percent" ? "active" : ""}`}
                                                        onClick={() => {
                                                            const sls = [...form.sls];
                                                            sls[idx].mode = "percent";
                                                            setForm({ ...form, sls });
                                                        }}
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="inputLabelShift">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={remaining}
                                                    placeholder="Allocation %"
                                                    value={sl.allocation ?? 0}
                                                    onChange={(e) => {
                                                        let val = Number(e.target.value);
                                                        if (val < 0) val = 0;
                                                        if (val > remaining) val = remaining;
                                                        const sls = [...form.sls];
                                                        sls[idx].allocation = val;
                                                        setForm({ ...form, sls });
                                                    }}
                                                    onBlur={(e) => handleSLAllocationBlur(idx, e.target.value)}
                                                />
                                                <label>Allocation %</label>

                                            </div>
                                        </div>
                                    );
                                })}

                                {form.avgSLPrice && (
                                    <span className="valueDisplay flexRow flex_center">
                                        Average SL Price: {form.avgSLPrice}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}


                    {/* TP Section (Running Trades) */}
                    {form.tradeStatus === "running" && (
                        <div className="tradeGrid" style={{ padding: "0 0 24px 0" }}>
                            <span className="label">Take Profits</span>
                            <div className="flexClm gap_32">
                                {form.tps.map((tp, idx) => {
                                    const entryPrice = form.avgEntryPrice || form.entries[0]?.price;

                                    const slPrices = form.sls.map((sl) =>
                                        sl.mode === "percent"
                                            ? calcPriceFromPercent(entryPrice, sl.percent, form.direction)
                                            : sl.price
                                    ).filter((p) => !!p && !isNaN(p));

                                    const minSLPrice = slPrices.length ? Math.min(...slPrices) : null;

                                    let tpPrice =
                                        tp.mode === "percent"
                                            ? calcPriceFromPercent(entryPrice, tp.percent, form.direction)
                                            : tp.price;

                                    if (minSLPrice !== null) {
                                        if (form.direction === "long" && tpPrice <= minSLPrice) tpPrice = minSLPrice + 0.01;
                                        if (form.direction === "short" && tpPrice >= minSLPrice) tpPrice = minSLPrice - 0.01;
                                    }

                                    const usedOther = form.tps.reduce(
                                        (sum, t, i) => (i !== idx ? sum + Number(t.allocation || 0) : sum),
                                        0
                                    );
                                    const remaining = Math.max(0, 100 - usedOther);

                                    return (
                                        <div key={idx} className="flexClm gap_32">
                                            <div className="flexRow flexRow_stretch gap_4">
                                                <div className="inputLabelShift">
                                                    {tp.mode === "price" ? (
                                                        <div className="inputLabelShift">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                min="0"
                                                                placeholder="TP Price"
                                                                value={tp.price ?? ""}
                                                                onChange={(e) => {
                                                                    let val = Math.abs(Number(e.target.value));
                                                                    if (isNaN(val)) val = "";
                                                                    const tps = [...form.tps];
                                                                    tps[idx].price = val;
                                                                    setForm({ ...form, tps });
                                                                }}
                                                            />
                                                            <label>TP Price</label>
                                                        </div>
                                                    ) : (
                                                        <div className="inputLabelShift">
                                                            <input
                                                                type="number"
                                                                step="any"
                                                                placeholder="TP %"
                                                                value={tp.percent ?? ""}
                                                                onChange={(e) => {
                                                                    let val = Number(e.target.value);
                                                                    const tps = [...form.tps];
                                                                    tps[idx].percent = isNaN(val) ? "" : val;
                                                                    setForm({ ...form, tps });
                                                                }}
                                                            />
                                                            <label>TP %</label>
                                                            <div className="font_12" style={{ position: "relative" }}>
                                                                <span style={{ position: "absolute", bottom: "-20px", right: "1px" }}>
                                                                    TP Price: {tpPrice ? formatPrice(Number(tpPrice)) : "0"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flexRow gap_4">
                                                    <button
                                                        type="button"
                                                        className={`button_sec icon-wrapper ${tp.mode === "price" ? "active" : ""}`}
                                                        onClick={() => {
                                                            const tps = [...form.tps];
                                                            tps[idx].mode = "price";
                                                            setForm({ ...form, tps });
                                                        }}
                                                    >
                                                        {currencySymbol}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`button_sec icon-wrapper ${tp.mode === "percent" ? "active" : ""}`}
                                                        onClick={() => {
                                                            const tps = [...form.tps];
                                                            tps[idx].mode = "percent";
                                                            setForm({ ...form, tps });
                                                        }}
                                                    >
                                                        %
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="inputLabelShift">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={remaining}
                                                    placeholder="Allocation %"
                                                    value={tp.allocation ?? 0}
                                                    onChange={(e) => {
                                                        let val = Number(e.target.value);
                                                        if (val < 0) val = 0;
                                                        if (val > remaining) val = remaining;
                                                        const tps = [...form.tps];
                                                        tps[idx].allocation = val;
                                                        setForm({ ...form, tps });
                                                    }}
                                                    onBlur={(e) => handleTPAllocationBlur(idx, e.target.value)}
                                                />
                                                <label>Allocation %</label>

                                            </div>
                                        </div>
                                    );
                                })}

                                {form.avgTPPrice && (
                                    <span className="valueDisplay flexRow flex_center">
                                        Average TP Price: {form.avgTPPrice}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}


                    {/* Open Time + Image */}
                    <div className="tradeGrid">
                        <span className="label">Open Time</span>
                        <div className="flexClm gap_12">
                            <DateTimePicker
                                label=""
                                value={form.openTime}
                                onChange={(date) =>
                                    setForm((prev) => ({ ...prev, openTime: date }))
                                }
                            />
                            <div className="imagePicker">
                                {form.openImagePreview ? (
                                    <div className="preview">
                                        <img src={form.openImagePreview} alt="Open Preview" />
                                        <button
                                            type="button"
                                            className="removeBtn flexRow flex_center button_ter"
                                            onClick={() =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    openImage: null,
                                                    openImagePreview: "",
                                                }))
                                            }
                                            aria-label="Remove image"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="uploadBox flexRow flex_center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={(e) => handleImageChange(e, "openImage", setForm)}
                                        />
                                        <div className="placeholder flexRow flex_center gap_24">
                                            <div className="iconCircle">
                                                <Upload size={20} />
                                            </div>
                                            <div className="gap_8 flexClm flex_center">
                                                <span className="title font_14">Upload Open Chart</span>
                                                <span className="subtitle font_12">PNG, JPG up to 5MB</span>
                                            </div>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>


                    {/* Close Time + Image */}
                    <div className="tradeGrid">
                        <span className="label">Close Time</span>
                        <div className="flexClm gap_12">
                            <DateTimePicker
                                label=""
                                value={form.closeTime}
                                onChange={(date) =>
                                    setForm((prev) => ({ ...prev, closeTime: date }))
                                }
                            />
                            <div className="imagePicker">
                                {form.closeImagePreview ? (
                                    <div className="preview">
                                        <img src={form.closeImagePreview} alt="Close Preview" />
                                        <button
                                            type="button"
                                            className="removeBtn flexRow flex_center button_ter"
                                            onClick={() =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    closeImage: null,
                                                    closeImagePreview: "",
                                                }))
                                            }
                                            aria-label="Remove image"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="uploadBox flexRow flex_center">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            hidden
                                            onChange={(e) => handleImageChange(e, "closeImage", setForm)}
                                        />
                                        <div className="placeholder flexRow flex_center gap_24">
                                            <div className="iconCircle">
                                                <Upload size={20} />
                                            </div>
                                            <div className="gap_8 flexClm flex_center">
                                                <span className="title font_14">Upload Close Chart</span>
                                                <span className="subtitle font_12">PNG, JPG up to 5MB</span>
                                            </div>

                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Rules Toggle */}
                    <div className="tradeGrid">
                        <span className="label">Rules Followed</span>
                        <div
                            className={`toggleSwitch ${form.rulesFollowed ? "on" : "off"}`}
                            onClick={() =>
                                setForm((prev) => ({
                                    ...prev,
                                    rulesFollowed: !prev.rulesFollowed,
                                }))
                            }
                            role="switch"
                            aria-checked={form.rulesFollowed}
                        >
                            <div className="toggleCircle flexRow flex_center">
                                {form.rulesFollowed ? <Check color="green" size={14} /> : <X color="black" size={14} />}
                            </div>
                            <span className="toggleLabel">
                                {form.rulesFollowed ? "Yes" : "No"}
                            </span>
                        </div>
                    </div>

                    {/* Reason */}
                    <div className="tradeGrid">
                        <label className="label">Reason</label>
                        <textarea
                            className="textarea"
                            name="reason"
                            value={form.reason}
                            onChange={handleChange}
                            placeholder="Write your reason here..."
                        />
                    </div>

                    {/* Learnings */}
                    <div className="tradeGrid">
                        <label className="label">Learnings</label>
                        <textarea
                            className="textarea"
                            name="learnings"
                            value={form.learnings}
                            onChange={handleChange}
                            placeholder="What did you learn from this trade?"
                        />
                    </div>



                </div>



                <BackgroundBlur />


            </form>

            <div className="popups_btm flexRow flexRow_stretch gap_4" style={{ width: "90%", backdropFilter: 'blur(20px)', padding: '8px 8px' }}>
                <button className="button_sec" onClick={() => router.push("/trade")}>
                    <ArrowLeftCircle size={20} />
                </button>
                <button className="button_pri" style={{ width: "100%" }} onClick={handleSubmit}>
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
