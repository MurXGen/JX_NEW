import { getCurrencySymbol } from "@/utils/currencySymbol";
import { formatCurrency } from "@/utils/formatNumbers";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle,
  CircleDot,
  Clock,
  Edit3,
  Lightbulb,
  Loader2,
  PlayCircle,
  Trash2,
  X,
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
  const [deleting, setDeleting] = useState(false);
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

  // --- Handlers ---
  const handleEdit = () => {
    router.push("/add-trade?mode=edit");
  };

  const handleCloseTrade = () => {
    router.push("/add-trade?mode=close");
  };

  const handleDeleteTrade = async () => {
    setIsConfirmOpen(false); // close modal
    setIsDeleting(true); // show loader

    try {
      const tradeId = localStorage.getItem("__t_rd_iD");

      const res = await axios.delete(`${API_BASE}/api/trades/delete`, {
        withCredentials: true,
        headers: { "x-trade-id": tradeId },
      });

      if (res.data.success) {
        const { userData, message } = res.data;

        // ✅ Save full userData to IndexedDB (same as add/update)
        await saveToIndexedDB("user-data", userData);

        setToast({
          type: "success",
          message: message || "Trade deleted successfully!",
        });

        // Optional: Refresh UI after short delay
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

  if (loading) {
    return <FullPageLoader />;
  }

  if (!trade) return null;

  const isProfit = trade.pnl > 0;
  const isLoss = trade.pnl < 0;
  const isBreakeven = trade.pnl === 0;

  return (
    <AnimatePresence>
      <motion.div
        className="modalOverlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="modalContent"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modalHeader flexRow flexRow_stretch">
            <div className="flexRow gap_12">
              <div
                className={`positionIcon large ${trade.direction?.toLowerCase()}`}
              >
                {trade.direction?.toLowerCase() === "long" ? (
                  <ArrowUp size={24} />
                ) : (
                  <ArrowDown size={24} />
                )}
              </div>
              <div className="modalHeaderText flexClm">
                <span className="modalHeaderTitle">{trade.symbol}</span>
                <span className="modalHeaderDesc">
                  {trade.direction} Position
                </span>
              </div>
            </div>

            <div className="flexRow gap_12">
              {/* Status Badge */}
              <div className={`statusBadge ${trade.tradeStatus}`}>
                {trade.tradeStatus === "running" && (
                  <>
                    <PlayCircle size={16} className="statusIcon" />
                    <span>Active</span>
                  </>
                )}
                {trade.tradeStatus === "closed" && (
                  <>
                    <CheckCircle size={16} className="statusIcon" />
                    <span>Closed</span>
                  </>
                )}
                {trade.tradeStatus === "quick" && (
                  <>
                    <Zap size={16} className="statusIcon" />
                    <span>Quick</span>
                  </>
                )}
              </div>

              {/* Close Button */}
              <button className="closeBtn button_ter flexRow" onClick={onClose}>
                <X className="crossIcon" size={24} />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="modalBody">
            {/* Images */}
            {(trade.openImageUrl || trade.closeImageUrl) && (
              <div className="imagesSection">
                <div className="imagesGrid">
                  {trade.openImageUrl && (
                    <div className="imageContainer">
                      <span className="font_12 shade_50">Open Image</span>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        {!trade.openImageLoaded && (
                          <div className="spinner"></div>
                        )}
                        <Image
                          src={trade.openImageUrl}
                          alt="Open trade"
                          width={400}
                          height={300}
                          priority
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAA..."
                          className="tradeImage fadeInImage"
                          data-loaded={trade.openImageLoaded ? "true" : "false"}
                          onLoadingComplete={() =>
                            setTrade((prev) => ({
                              ...prev,
                              openImageLoaded: true,
                            }))
                          }
                          onClick={() =>
                            window.open(trade.openImageUrl, "_blank")
                          }
                        />
                      </div>
                    </div>
                  )}

                  {trade.closeImageUrl && (
                    <div className="imageContainer">
                      <span className="font_12 shade_50">Close Image</span>
                      <div
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        {!trade.closeImageLoaded && (
                          <div className="spinner"></div>
                        )}
                        <Image
                          src={trade.closeImageUrl}
                          alt="Close trade"
                          width={400}
                          height={300}
                          priority
                          placeholder="blur"
                          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAA..."
                          className="tradeImage fadeInImage"
                          data-loaded={
                            trade.closeImageLoaded ? "true" : "false"
                          }
                          onLoadingComplete={() =>
                            setTrade((prev) => ({
                              ...prev,
                              closeImageLoaded: true,
                            }))
                          }
                          onClick={() =>
                            window.open(trade.closeImageUrl, "_blank")
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ✅ Normalize reason before rendering */}
            {trade.reason?.length > 0 && (
              <div className="notesCard marg_btm_16">
                <div className="flexRow">
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
                      <span className="tag" key={idx}>
                        {r}
                      </span>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* PnL Section */}
            {trade.tradeStatus !== "running" && (
              <div
                className={`pnlSection chart_boxBg ${
                  isProfit ? "profit" : isLoss ? "loss" : "breakeven"
                }`}
              >
                <div className="pnlLabel flexRow flexRow_stretch">
                  <span className="pnlLabel">Profit & Loss</span>
                  <span
                    className={`pnlValue font_weight_600 ${
                      isProfit ? "success" : isLoss ? "error" : "shade_50"
                    }`}
                  >
                    {isProfit ? "+" : ""}
                    {formatCurrency(trade.pnl)}
                  </span>
                </div>
              </div>
            )}

            {/* Fees */}
            {trade.feeAmount > 0 && (
              <div className="boxBg flexClm gap_12 marg_btm_16">
                <span className="font_12 shade_50">
                  {trade.tradeStatus === "running"
                    ? "Trade Open Fees"
                    : "Trade Open + Close Fees"}
                </span>
                <span className="font_14">
                  {getCurrencySymbol(localStorage.getItem("currencyCode"))}{" "}
                  {trade.feeAmount.toFixed(2)}
                </span>
              </div>
            )}

            {/* Trade Details Grid */}
            {/* {trade.tradeStatus === "running" && ( */}
            <div className="quantityGrid">
              <div className="boxBg flexClm gap_12">
                <span className="font_12 shade_50">Quantity</span>
                <span className="font_14">{trade.quantityUSD} USD</span>
              </div>
              <div className="boxBg flexClm gap_12">
                <span className="font_12 shade_50">Leverage</span>
                <span className="font_14">{trade.leverage}x</span>
              </div>
              <div className="boxBg flexClm gap_12">
                <span className="font_12 shade_50">Total Quantity</span>
                <span className="font_14">{trade.totalQuantity}</span>
              </div>
            </div>
            {/* )} */}

            {trade.tradeStatus === "closed" && (
              <div className="detailsGrid">
                <div className="boxBg flexClm gap_12">
                  <span className="font_12 shade_50">Avg Entry</span>
                  <span className="font_14">{trade.avgEntryPrice}</span>
                </div>
                <div className="boxBg flexClm gap_12">
                  <span className="font_12 shade_50">Avg Exit</span>
                  <span className="font_14">{trade.avgExitPrice}</span>
                </div>
              </div>
            )}

            {/* Details Grid */}
            {trade.tradeStatus === "running" && (
              <div className="detailsGrid">
                {/* Entry Price */}
                <div className="boxBg flexClm gap_12">
                  <span className="font_12 shade_50">Entry</span>
                  <span className="font_14">{trade.avgEntryPrice}</span>
                </div>

                {/* Stop Loss */}
                <div className="boxBg flexRow gap_12">
                  <div className="flexClm gap_4">
                    <span className="font_12 shade_50">SL Price</span>
                    <span className="font_14 flexRow gap_12">
                      {trade.avgSLPrice}{" "}
                      <span className="font_14 error">
                        {" "}
                        -{formatCurrency(trade.expectedLoss)}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Take Profit */}
                <div className="boxBg flexRow gap_12">
                  <div className="flexClm gap_4">
                    <span className="font_12 shade_50">TP Price</span>
                    <span className="font_14 flexRow gap_12">
                      {trade.avgTPPrice}
                      <span className="font_14 success">
                        +{formatCurrency(trade.expectedProfit)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Time Section */}
            <div className="timeSection">
              <div className="timelineWrapper">
                {/* Start Time */}
                <div className="timelinePoint startPoint">
                  <div className="boxBg flexRow gap_12">
                    <div>
                      <div className="timeDot startDot">
                        <CircleDot size={14} />
                      </div>
                    </div>
                    <div>
                      <span className="tradeInfoDate flexRow gap_4">
                        {new Date(trade.openTime).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="tradeInfoTime">
                        {new Date(trade.openTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline with Duration */}
                <div className="timelineLineWrapper">
                  {(() => {
                    const start = new Date(trade.openTime);
                    const end =
                      trade.tradeStatus === "running"
                        ? new Date()
                        : new Date(trade.closeTime);

                    const diffMs = end - start;
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    const days = Math.floor(diffMins / (60 * 24));
                    const hours = Math.floor((diffMins % (60 * 24)) / 60);
                    const mins = diffMins % 60;

                    let duration = "";
                    if (days > 0) duration += `${days}d `;
                    if (hours > 0) duration += `${hours}h `;
                    if (mins > 0 || duration === "") duration += `${mins}m`;

                    return (
                      <div className="tradeDuration flexRow flex_center">
                        {duration}
                      </div>
                    );
                  })()}

                  <div
                    className={`timelineLine ${
                      trade.tradeStatus === "running" ? "running" : "completed"
                    }`}
                  >
                    <div className="timelineLight" />
                    <div className="timelineDot startTimelineDot" />
                    <div className="timelineDot endTimelineDot" />
                  </div>
                </div>

                {/* End Time (only for closed trades) */}
                {trade.closeTime && trade.tradeStatus !== "running" && (
                  <div className="timelinePoint endPoint">
                    <div className="flexRow gap_12 boxBg">
                      <div>
                        <div className="timeDot endDot">
                          <X size={14} />
                        </div>
                      </div>
                      <div>
                        <span
                          className="tradeInfoDate flexRow gap_4"
                          style={{ justifyContent: "flex-end" }}
                        >
                          {new Date(trade.closeTime).toLocaleDateString(
                            "en-US",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </span>
                        <span
                          className="tradeInfoTime"
                          style={{ textAlign: "right" }}
                        >
                          {new Date(trade.closeTime).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Current time indicator for running trades */}
                {trade.tradeStatus === "running" && (
                  <div className="timelinePoint">
                    <div className="boxBg flexRow gap_12">
                      <div>
                        <div className="timeDot currentDot">
                          <Clock size={14} />
                        </div>
                      </div>
                      <div>
                        <span className="tradeInfoDate flexRow gap_4">
                          Till now
                        </span>
                        <span className="tradeInfoTime">Running</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Reason & Learnings */}
            <div className="notesSection">
              {trade.learnings && (
                <div className="notesCard">
                  <h3 className="font_16 font_weight_600 flexRow gap_8">
                    <Lightbulb size={18} />
                    Key Learnings
                  </h3>
                  <p className="font_14">{trade.learnings}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="modalActions flexRow gap_12">
            {/* Delete Button */}
            <button
              onClick={() => setIsConfirmOpen(true)}
              className="button_sec error"
              style={{ background: "var(--base-bg)" }}
            >
              <Trash2 size={16} />
            </button>

            {/* Confirmation Modal */}
            <ConfirmationModal
              isOpen={isConfirmOpen}
              title="Delete Trade"
              message="Are you sure you want to delete this trade? This action cannot be undone."
              onConfirm={handleDeleteTrade}
              onCancel={() => setIsConfirmOpen(false)}
            />

            {/* Full Page Loader */}
            {isDeleting && <FullPageLoader />}

            {trade.tradeStatus === "running" && (
              <button
                onClick={handleCloseTrade}
                className="button_sec flexRow gap_4 width100 flex_center"
                disabled={deleting}
              >
                <Clock size={18} />
                Close Trade
              </button>
            )}
            <button
              onClick={handleEdit}
              className="button_pri flexRow gap_4 width100 flex_center"
              disabled={deleting}
            >
              <Edit3 size={18} />
              Edit Trade
            </button>
          </div>
        </motion.div>
      </motion.div>
      {/* Toast Message */}
      {toast.message && (
        <ToastMessage
          type={toast.type}
          message={toast.message}
          duration={3000}
        />
      )}
    </AnimatePresence>
  );
};

export default TradeInfo;
