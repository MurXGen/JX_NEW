import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatCurrency } from "@/utils/formatNumbers";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  DollarSign,
  Edit3,
  GanttChartSquare,
  Lightbulb,
  LineChart,
  Minus,
  Percent,
  PlayCircle,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ConfirmationModal from "../ui/ConfirmationModal";
import FullPageLoader from "../ui/FullPageLoader";
import ToastMessage from "../ui/ToastMessage";

const TRADE_KEY = "__t_rd_iD";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TradeInfo = ({ onClose }) => {
  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState({ type: "", message: "" });

  useEffect(() => {
    const fetchTrade = async () => {
      const tradeId = localStorage.getItem(TRADE_KEY);
      if (!tradeId) return;

      const userData = await getFromIndexedDB("user-data");
      const tradeData = userData?.trades?.find((t) => t._id === tradeId);
      setTrade(tradeData);
      setLoading(false);
    };

    fetchTrade();
  }, []);

  const handleEdit = () => {
    router.push("/add-trade?mode=edit");
  };

  const handleDeleteTrade = async () => {
    setIsConfirmOpen(false);
    setIsDeleting(true);

    try {
      const tradeId = localStorage.getItem("__t_rd_iD");

      const res = await axios.delete(`${API_BASE}/api/trades/delete`, {
        withCredentials: true,
        headers: { "x-trade-id": tradeId },
      });

      if (res.data.success) {
        const { userData, message } = res.data;
        await saveToIndexedDB("user-data", userData);
        setToast({
          type: "success",
          message: message || "Trade deleted successfully!",
        });
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setToast({ type: "error", message: "Failed to delete trade!" });
      }
    } catch (err) {
      setToast({
        type: "error",
        message: "Something went wrong while deleting trade.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <FullPageLoader />;
  if (!trade) return null;

  const isProfit = trade.pnl > 0;
  const isLoss = trade.pnl < 0;
  const isRunning = trade.tradeStatus === "running";
  const isLong = trade.direction?.toLowerCase() === "long";

  const formatDuration = () => {
    const start = new Date(trade.openTime);
    const end = isRunning ? new Date() : new Date(trade.closeTime);
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(diffMins / (60 * 24));
    const hours = Math.floor((diffMins % (60 * 24)) / 60);
    const mins = diffMins % 60;
    let duration = "";
    if (days > 0) duration += `${days}d `;
    if (hours > 0) duration += `${hours}h `;
    if (mins > 0 || duration === "") duration += `${mins}m`;
    return duration;
  };

  const StatItem = ({ icon: Icon, label, value, color }) => (
    <div className="stats-card radius-12">
      <div>
        <div className="card-label">{label}</div>
        <div className="card-value">{value}</div>
      </div>
    </div>
  );

  const InfoChip = ({ icon: Icon, label, value }) => (
    <div
      style={{
        background: "var(--black-4)",
        borderRadius: "var(--px-20)",
        padding: "var(--px-8) var(--px-12)",
        display: "flex",
        alignItems: "center",
        gap: "var(--px-8)",
        fontSize: "var(--px-14)",
        color: "var(--black)",
      }}
    >
      <Icon size={16} color="var(--black-50)" />
      <span style={{ fontWeight: "var(--weight-500)" }}>{label}:</span>
      <span>{value}</span>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--mobile-bg)",
          zIndex: 1000,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            background: "var(--white)",
            borderBottom: "1px solid var(--black-4)",
            padding: "var(--px-16)",
            display: "flex",
            alignItems: "center",
            gap: "var(--px-12)",
            zIndex: 10,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              padding: "var(--px-8)",
              cursor: "pointer",
              display: "flex",
              borderRadius: "var(--px-8)",
              color: "var(--black)",
            }}
          >
            <ChevronLeft size={24} />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--px-12)",
              flex: 1,
            }}
          >
            {/* <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "var(--px-14)",
                background: isLong ? "var(--success-10)" : "var(--error-10)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isLong ? "var(--success)" : "var(--error)",
              }}
            >
              {isLong ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div> */}
            <div>
              <div className="font_20">{trade.symbol}</div>
              <div className="font_14">{trade.direction}</div>
            </div>
          </div>

          <div
            style={{
              padding: "var(--px-8) var(--px-14)",
              borderRadius: "var(--px-20)",
              fontSize: "var(--px-14)",
              fontWeight: "var(--weight-600)",
              background: isRunning
                ? "var(--primary-10)"
                : trade.tradeStatus === "closed"
                  ? "var(--success-10)"
                  : "var(--black-4)",
              color: isRunning
                ? "var(--primary)"
                : trade.tradeStatus === "closed"
                  ? "var(--success)"
                  : "var(--black-50)",
              display: "flex",
              alignItems: "center",
              gap: "var(--px-4)",
            }}
          >
            {isRunning && <PlayCircle size={16} />}
            {trade.tradeStatus === "closed" && <CheckCircle size={16} />}
            {trade.tradeStatus === "quick" && <Zap size={16} />}
            <span style={{ textTransform: "capitalize" }}>
              {trade.tradeStatus}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "var(--px-16)" }}>
          {/* P&L Card */}
          {!isRunning && (
            <div
              style={{
                background: isProfit
                  ? "var(--success-10)"
                  : isLoss
                    ? "var(--error-10)"
                    : "var(--black-4)",
                borderRadius: "var(--px-16)",
                padding: "var(--px-20)",
                marginBottom: "var(--px-24)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: `1px solid ${isProfit ? "var(--success-20)" : isLoss ? "var(--error-20)" : "var(--black-4)"}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--px-12)",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "var(--px-14)",
                    background: "var(--white)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: isProfit
                      ? "var(--success)"
                      : isLoss
                        ? "var(--error)"
                        : "var(--black-50)",
                  }}
                >
                  {isProfit ? (
                    <TrendingUp size={24} />
                  ) : isLoss ? (
                    <TrendingDown size={24} />
                  ) : (
                    <Minus size={24} />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "var(--px-14)', color: 'var(--black-50)",
                    }}
                  >
                    Total P&L
                  </div>
                  <div
                    style={{
                      fontSize: "var(--px-24)', fontWeight: 'var(--weight-700)",
                    }}
                  >
                    {isProfit ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </div>
                </div>
              </div>
              <div
                style={{
                  padding: "var(--px-8) var(--px-14)",
                  background: "var(--white)",
                  borderRadius: "var(--px-20)",
                  fontSize: "var(--px-14)",
                  fontWeight: "var(--weight-600)",
                  color: isProfit
                    ? "var(--success)"
                    : isLoss
                      ? "var(--error)"
                      : "var(--black-50)",
                }}
              >
                {((trade.pnl / (trade.quantityUSD || 1)) * 100).toFixed(2)}%
              </div>
            </div>
          )}

          {/* Images Grid */}
          {(trade.openImageUrl || trade.closeImageUrl) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--px-12)",
                marginBottom: "var(--px-24)",
              }}
            >
              {trade.openImageUrl ? (
                <div>
                  <div
                    style={{
                      fontSize: "var(--px-12)', color: 'var(--black-50)",
                      marginBottom: "var(--px-8)",
                    }}
                  >
                    Entry Screenshot
                  </div>
                  <img
                    src={trade.openImageUrl}
                    alt="Entry"
                    style={{
                      width: "100%",
                      height: "140px",
                      objectFit: "cover",
                      borderRadius: "var(--px-12)",
                      border: "1px solid var(--black-4)",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(trade.openImageUrl, "_blank")}
                  />
                </div>
              ) : null}

              {trade.closeImageUrl ? (
                <div className="flexClm gap_8">
                  <div className="font_16 font_weight_600">Exit Screenshot</div>
                  <img
                    src={trade.closeImageUrl}
                    alt="Exit"
                    style={{
                      width: "100%",
                      height: "200px",
                      objectFit: "cover",
                      borderRadius: "var(--px-12)",
                      border: "1px solid var(--black-4)",
                      cursor: "pointer",
                    }}
                    onClick={() => window.open(trade.closeImageUrl, "_blank")}
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Quick Stats Row */}
          <div
            style={{
              display: "flex",
              overflow: "scroll",
              gap: "var(--px-8)",
              marginBottom: "var(--px-24)",
            }}
          >
            <InfoChip
              icon={Calendar}
              label="Opened"
              value={new Date(trade.openTime).toLocaleDateString()}
            />
            {!isRunning && (
              <InfoChip
                icon={Clock}
                label="Duration"
                value={formatDuration()}
              />
            )}
            {trade.leverage && (
              <InfoChip
                icon={Percent}
                label="Leverage"
                value={`${trade.leverage}x`}
              />
            )}
          </div>

          {/* Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "var(--px-12)",
              marginBottom: "var(--px-24)",
            }}
          >
            <StatItem
              icon={DollarSign}
              label="Quantity"
              value={`${trade.quantityUSD} USD`}
            />

            <StatItem
              icon={LineChart}
              label="Avg Entry"
              value={trade.avgEntryPrice}
            />

            {!isRunning && (
              <StatItem
                icon={Target}
                label="Avg Exit"
                value={trade.avgExitPrice || "-"}
              />
            )}

            {isRunning && (
              <>
                <StatItem
                  icon={TrendingDown}
                  label="Stop Loss"
                  value={trade.avgSLPrice || "-"}
                  color="var(--error)"
                />
                <StatItem
                  icon={TrendingUp}
                  label="Take Profit"
                  value={trade.avgTPPrice || "-"}
                  color="var(--success)"
                />
              </>
            )}
          </div>

          <div className="flexClm gap_12">
            {/* Reasons */}
            {trade.reason?.length > 0 && (
              <div className="stats-card radius-12">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--px-8)",
                    marginBottom: "var(--px-12)",
                  }}
                >
                  <GanttChartSquare size={18} color="var(--primary)" />
                  <span
                    style={{
                      fontSize: "var(--px-14)', fontWeight: 'var(--weight-600)",
                      color: "var(--black)",
                    }}
                  >
                    Trade Reasons
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "var(--px-8)",
                  }}
                >
                  {(() => {
                    let reasons = [];
                    if (Array.isArray(trade.reason)) {
                      if (
                        trade.reason.length === 1 &&
                        typeof trade.reason[0] === "string"
                      ) {
                        try {
                          reasons = JSON.parse(trade.reason[0]);
                        } catch {
                          reasons = trade.reason;
                        }
                      } else {
                        reasons = trade.reason;
                      }
                    }
                    return reasons.map((r, idx) => (
                      <button key={idx} className="btn" type="button">
                        {r}
                      </button>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Learnings */}
            {trade.learnings && (
              <div className="stats-card radius-12">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--px-8)",
                    marginBottom: "var(--px-12)",
                  }}
                >
                  <Lightbulb size={18} color="var(--primary)" />
                  <span
                    style={{
                      fontSize: "var(--px-14)', fontWeight: 'var(--weight-600)",
                      color: "var(--black)",
                    }}
                  >
                    Key Learnings
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "var(--px-14)",
                    lineHeight: "1.6",
                    color: "var(--black)",
                    margin: 0,
                  }}
                >
                  {trade.learnings}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: "flex",
              gap: "var(--px-12)",
              padding: "var(--px-16) 0 var(--px-32) 0",
            }}
          >
            <button
              onClick={() => setIsConfirmOpen(true)}
              style={{
                flex: 1,
                padding: "var(--px-16)",
                border: "1px solid var(--error)",
                background: "none",
                borderRadius: "var(--px-14)",
                color: "var(--error)",
                fontSize: "var(--px-16)",
                fontWeight: "var(--weight-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--px-8)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "var(--error-10)")
              }
              onMouseLeave={(e) => (e.target.style.background = "none")}
            >
              <Trash2 size={18} /> Delete
            </button>

            <button
              onClick={handleEdit}
              style={{
                flex: 1,
                padding: "var(--px-16)",
                border: "none",
                background: "var(--primary)",
                borderRadius: "var(--px-14)",
                color: "var(--white)",
                fontSize: "var(--px-16)",
                fontWeight: "var(--weight-600)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "var(--px-8)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.target.style.background = "var(--primary-light)")
              }
              onMouseLeave={(e) =>
                (e.target.style.background = "var(--primary)")
              }
            >
              <Edit3 size={18} /> Edit
            </button>
          </div>
        </div>

        {/* Modals */}
        <ConfirmationModal
          isOpen={isConfirmOpen}
          title="Delete Trade"
          message="Are you sure you want to delete this trade? This action cannot be undone."
          onConfirm={handleDeleteTrade}
          onCancel={() => setIsConfirmOpen(false)}
        />

        {isDeleting && <FullPageLoader />}

        {toast.message && (
          <ToastMessage
            type={toast.type}
            message={toast.message}
            duration={3000}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default TradeInfo;
