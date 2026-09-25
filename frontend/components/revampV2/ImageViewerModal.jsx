"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { ChevronLeft, ChevronRight, Download, Plus, Trash2, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma screenshot viewer (22797:53764), large preview, thumbnail
   strip, prev/next, download, add (POST /:id/images) and delete
   (DELETE /:id/images). Images live on Backblaze; URLs in Mongo. */

export default function ImageViewerModal({ open, trade, onClose, onImagesChanged }) {
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const flash = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, []);

  useEffect(() => {
    if (open && trade) {
      const urls = (trade.images || [])
        .map((i) => (typeof i === "string" ? { url: i } : i))
        .filter((i) => i.url);
      setImages(urls);
      setIndex(0);
    }
  }, [open, trade]);

  const current = images[index];
  const canCrud = trade?._id && !String(trade._id).startsWith("d");

  const syncIndexedDB = async (tradeId, imgs) => {
    try {
      const userData = (await getFromIndexedDB("user-data")) || {};
      userData.trades = (userData.trades || []).map((t) =>
        t._id === tradeId ? { ...t, images: imgs } : t,
      );
      await saveToIndexedDB("user-data", userData);
    } catch (e) {
      console.error("IndexedDB sync failed:", e);
    }
  };

  const addImage = async (file) => {
    if (!file || !canCrud) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await axios.post(`${API_BASE}/api/trades/${trade._id}/images`, fd, {
        withCredentials: true,
      });
      const imgs = res.data.images || [];
      setImages(imgs);
      setIndex(imgs.length - 1);
      await syncIndexedDB(trade._id, imgs);
      onImagesChanged?.(trade._id, imgs);
      flash("success", "Screenshot added");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not add image");
    } finally {
      setBusy(false);
    }
  };

  const deleteImage = async () => {
    if (!current || !canCrud) return;
    setBusy(true);
    try {
      const res = await axios.delete(`${API_BASE}/api/trades/${trade._id}/images`, {
        withCredentials: true,
        data: { url: current.url },
      });
      const imgs = res.data.images || [];
      setImages(imgs);
      setIndex((i) => Math.max(0, Math.min(i, imgs.length - 1)));
      await syncIndexedDB(trade._id, imgs);
      onImagesChanged?.(trade._id, imgs);
      setConfirmDelete(false);
      flash("success", "Screenshot deleted");
    } catch (err) {
      flash("danger", err.response?.data?.message || "Could not delete image");
    } finally {
      setBusy(false);
    }
  };

  const download = () => {
    if (!current) return;
    const a = document.createElement("a");
    a.href = current.url;
    a.download = current.url.split("/").pop() || "screenshot.png";
    a.target = "_blank";
    a.click();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`jx-modal-overlay jx-modal-overlay--blur ${isMobile ? "jx-modal-overlay--sheet" : ""}`}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ zIndex: 1400, ...(isMobile ? { alignItems: "flex-end", justifyContent: "center", padding: 0 } : {}) }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: 14 }}
            animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
            exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className={`jx-ltmodal ${isMobile ? "jx-ltmodal--sheet" : ""}`}
            style={isMobile ? { position: "relative" } : { width: "min(860px, 96vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {isMobile && (
              <div aria-hidden="true" style={{ display: "flex", justifyContent: "center", padding: "10px 0 2px", flexShrink: 0 }}>
                <span style={{ width: 40, height: 4, borderRadius: 999, background: "var(--color-border-strong)" }} />
              </div>
            )}

            {/* header — title + close only; actions live in the bottom bar */}
            <div className="jx-ltmodal__header" style={{ alignItems: "center", gap: "var(--space-2)" }}>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <span style={{ font: "var(--text-h3)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {trade?.symbol || "Trade"} · screenshots
                </span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                  {images.length ? `${index + 1} of ${images.length}` : "No screenshots yet"}
                </span>
              </div>
              <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8, flexShrink: 0 }}>
                <X size={16} />
              </button>
            </div>

            {/* main preview — swipe left/right on touch, arrows on desktop */}
            <div style={{ position: "relative", background: "var(--color-bg-canvas)", flex: isMobile ? "1 1 auto" : "none", minHeight: isMobile ? 0 : 340, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)", overflow: "hidden" }}>
              {current ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={current.url}
                    src={current.url}
                    alt={`screenshot ${index + 1}`}
                    loading="lazy"
                    drag={images.length > 1 ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(e, info) => {
                      if (info.offset.x < -60) setIndex((i) => (i + 1) % images.length);
                      else if (info.offset.x > 60) setIndex((i) => (i - 1 + images.length) % images.length);
                    }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.16 }}
                    style={{ maxWidth: "100%", maxHeight: isMobile ? "62vh" : "58vh", borderRadius: "var(--radius-md)", objectFit: "contain", cursor: images.length > 1 ? "grab" : "default", touchAction: "pan-y" }}
                  />
                </AnimatePresence>
              ) : (
                <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)", textAlign: "center", padding: "var(--space-6) var(--space-4)" }}>
                  {canCrud ? "Add a chart screenshot to this trade" : "No screenshots on this trade"}
                </span>
              )}

              {images.length > 1 && !isMobile && (
                <>
                  <button className="jx-btn jx-btn--secondary jx-btn--sm" style={{ position: "absolute", left: 12, padding: 8 }} onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)} aria-label="Previous">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="jx-btn jx-btn--secondary jx-btn--sm" style={{ position: "absolute", right: 12, padding: 8 }} onClick={() => setIndex((i) => (i + 1) % images.length)} aria-label="Next">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* thumbnails */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-3) var(--space-4)", borderTop: "1px solid var(--color-border)", overflowX: "auto", flexShrink: 0 }}>
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.url}
                    src={img.url}
                    alt={`thumb ${i + 1}`}
                    loading="lazy"
                    onClick={() => setIndex(i)}
                    style={{
                      width: 64, height: 44, flexShrink: 0, objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "pointer",
                      outline: i === index ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      opacity: i === index ? 1 : 0.6,
                      transition: "opacity .15s ease",
                    }}
                  />
                ))}
              </div>
            )}

            {/* bottom action bar */}
            {(canCrud || current) && (
              <div className="jx-ltmodal__footer" style={{ gap: "var(--space-2)", justifyContent: isMobile ? "stretch" : "flex-end", flexWrap: "nowrap" }}>
                {canCrud && (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
                    <button className="jx-btn jx-btn--outline" onClick={() => fileRef.current?.click()} disabled={busy || images.length >= 4} style={isMobile ? { flex: 1, justifyContent: "center" } : undefined}>
                      <Plus size={15} /> Add
                    </button>
                  </>
                )}
                {current && (
                  <button className="jx-btn jx-btn--outline" onClick={download} style={isMobile ? { flex: 1, justifyContent: "center" } : undefined}>
                    <Download size={15} /> Download
                  </button>
                )}
                {current && canCrud && (
                  <button className="jx-btn jx-btn--danger-outline" onClick={() => setConfirmDelete(true)} disabled={busy} style={isMobile ? { flex: 1, justifyContent: "center" } : undefined}>
                    <Trash2 size={15} /> Delete
                  </button>
                )}
              </div>
            )}
          </motion.div>

          <ConfirmDialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            onConfirm={deleteImage}
            loading={busy}
            variant="danger"
            title="Delete this screenshot?"
            message="It will be removed from the trade and from storage. This can't be undone."
            confirmLabel="Delete"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
