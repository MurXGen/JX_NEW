"use client";

import { motion } from "framer-motion";
import {
  Edit3,
  Target,
  ShieldX,
  Repeat,
  CalendarDays,
  Image as ImageIcon,
  BookOpen,
} from "lucide-react";

const TradeSummary = ({ tradeStatus, form, openModal }) => {
  if (!["running", "closed", "quick"].includes(tradeStatus)) return null;

  return (
    <motion.div
      className="summarySection flexClm gap_24"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* 🟩 RUNNING TRADES */}
      {tradeStatus === "running" && (
        <>
          <SummaryBlock
            title="Entries"
            actions={[
              { icon: <Edit3 size={16} />, modal: "entries" },
              { icon: <Target size={16} />, modal: "takeprofit" },
              { icon: <ShieldX size={16} />, modal: "stoploss" },
            ]}
          >
            <SummaryRow
              label="Entry"
              value={form.entries?.map((e) => e.price).join(", ") || "0"}
            />
            <SummaryRow
              label="Take Profit"
              value={form.tps?.map((t) => t.price).join(", ") || "0"}
            />
            <SummaryRow
              label="Stop Loss"
              value={form.sls?.map((s) => s.price).join(", ") || "0"}
            />
          </SummaryBlock>

          <SummaryBlock
            title="Margin Preview"
            actions={[{ icon: <Edit3 size={16} />, modal: "quantity" }]}
          >
            <SummaryRow
              label="Expected Profit"
              value={form.expectedProfit || 0}
            />
            <SummaryRow label="Expected Loss" value={form.expectedLoss || 0} />
            <SummaryRow label="Fees" value={form.feeAmount || 0} />
          </SummaryBlock>

          <DateAndImages form={form} openModal={openModal} />
          <OtherFactors form={form} openModal={openModal} />
        </>
      )}

      {/* 🟦 CLOSED TRADES */}
      {tradeStatus === "closed" && (
        <>
          <SummaryBlock
            title="Entries & Exits"
            actions={[
              { icon: <Edit3 size={16} />, modal: "entries" },
              { icon: <Repeat size={16} />, modal: "exits" },
            ]}
          >
            <SummaryRow label="Entry" value={form.avgEntryPrice || "0"} />
            <SummaryRow label="Exit" value={form.avgExitPrice || "0"} />
            <SummaryRow label="PnL" value={form.pnl || "0"} />
            <SummaryRow
              label="PnL After Fees"
              value={form.pnlAfterFee || "0"}
            />
            <SummaryRow label="Fees" value={form.feeAmount || 0} />
          </SummaryBlock>

          <SummaryBlock
            title="Margin Summary"
            actions={[{ icon: <Edit3 size={16} />, modal: "quantity" }]}
          >
            <SummaryRow label="PnL" value={form.pnl || 0} />
            <SummaryRow label="PnL After Fees" value={form.pnlAfterFee || 0} />
            <SummaryRow label="Fees" value={form.feeAmount || 0} />
          </SummaryBlock>

          <DateAndImages form={form} openModal={openModal} />
          <OtherFactors form={form} openModal={openModal} />
        </>
      )}

      {/* 🟨 QUICK TRADES */}
      {tradeStatus === "quick" && (
        <>
          <DateAndImages form={form} openModal={openModal} />
          <OtherFactors form={form} openModal={openModal} />
        </>
      )}
    </motion.div>
  );
};

const SummaryBlock = ({ title, actions = [], children }) => (
  <div className="summaryBlock">
    <div className="flexRow flex_between flex_center">
      <span className="font_16 font_weight_600">{title}</span>
      <div className="flexRow gap_8">
        {actions.map((a, i) => (
          <button
            key={i}
            className="vector"
            onClick={() => a.modal && a.modal()}
          >
            {a.icon}
          </button>
        ))}
      </div>
    </div>
    <div className="flexClm gap_6">{children}</div>
  </div>
);

const SummaryRow = ({ label, value }) => (
  <span className="font_14 shade_60">
    {label}: <strong className="shade_80">{value}</strong>
  </span>
);

const DateAndImages = ({ form, openModal }) => (
  <div className="summaryBlock">
    <div className="flexRow flex_between flex_center">
      <span className="font_16 font_weight_600">Open / Close Details</span>
      <button className="vector" onClick={() => openModal("opentime")}>
        <CalendarDays size={16} />
      </button>
    </div>
    <div className="flexClm gap_8">
      <SummaryRow
        label="Open Time"
        value={form.openTime?.split("T")[0] || "N/A"}
      />
      <SummaryRow
        label="Close Time"
        value={form.closeTime?.split("T")[0] || "N/A"}
      />
      <div className="flexRow gap_16 margin_top_8">
        <ImagePreview label="Open Image" src={form.openImagePreview} />
        <ImagePreview label="Close Image" src={form.closeImagePreview} />
      </div>
    </div>
  </div>
);

const ImagePreview = ({ label, src }) => (
  <div className="flexClm flex_center">
    <span className="font_12 shade_50">{label}</span>
    {src ? (
      <img src={src} alt={label} className="snapshotPreview" />
    ) : (
      <div className="flexRow flex_center gap_4 shade_60 font_12">
        <ImageIcon size={14} /> No snapshot
      </div>
    )}
  </div>
);

const OtherFactors = ({ form, openModal }) => (
  <div className="summaryBlock">
    <div className="flexRow flex_between flex_center">
      <span className="font_16 font_weight_600">Other Factors</span>
      <BookOpen size={16} />
    </div>
    <div className="flexClm gap_8">
      <SummaryEditableRow
        label="Rules Followed"
        value={form.rulesFollowed ? "Yes" : "No"}
        onEdit={() => openModal("rules")}
      />
      <SummaryEditableRow
        label="Reasons"
        value={
          form.reason?.length ? form.reason.join(", ") : "No reasons selected"
        }
        onEdit={() => openModal("reason")}
      />
      <SummaryEditableRow
        label="Learnings"
        value={form.learnings || "Not added"}
        onEdit={() => openModal("learnings")}
      />
    </div>
  </div>
);

const SummaryEditableRow = ({ label, value, onEdit }) => (
  <div className="flexRow flex_between flex_center">
    <span className="font_14 shade_60">
      {label}: <strong className="shade_80">{value}</strong>
    </span>
    <button className="vector" onClick={onEdit}>
      <Edit3 size={15} />
    </button>
  </div>
);

export default TradeSummary;
