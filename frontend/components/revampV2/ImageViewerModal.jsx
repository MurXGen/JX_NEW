"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import { ChevronLeft, ChevronRight, Download, Plus, Trash2, X } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import Toast from "./Toast";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Figma screenshot viewer (22797:53764) — large preview, thumbnail
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
          className="jx-modal-overlay jx-modal-overlay--blur"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ zIndex: 1400 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <Toast toast={toast} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="jx-ltmodal"
            style={{ width: "min(860px, 96vw)" }}
          >
            {/* header */}
            <div className="jx-ltmodal__header" style={{ alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--text-h3)", fontWeight: 600 }}>
                  {trade?.symbol || "Trade"} · screenshots
                </span>
                <span style={{ font: "var(--text-caption)", color: "var(--color-text-muted)" }}>
                  {images.length ? `${index + 1} of ${images.length}` : "No screenshots yet"}
                </span>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                {canCrud && (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = ""; }} />
                    <button className="jx-btn jx-btn--outline jx-btn--sm" onClick={() => fileRef.current?.click()} disabled={busy || images.length >= 4}>
                      <Plus size={14} /> Add
                    </button>
                  </>
                )}
                {current && (
                  <button className="jx-btn jx-btn--outline jx-btn--sm" onClick={download}>
                    <Download size={14} /> Download
                  </button>
                )}
                {current && canCrud && (
                  <button className="jx-btn jx-btn--danger-outline jx-btn--sm" onClick={() => setConfirmDelete(true)} disabled={busy}>
                    <Trash2 size={14} /> Delete
                  </button>
                )}
                <button className="jx-btn jx-btn--secondary jx-btn--sm" onClick={onClose} aria-label="Close" style={{ padding: 8 }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* main preview */}
            <div style={{ position: "relative", background: "var(--color-bg-canvas)", minHeight: 320, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-4)" }}>
              {current ? (
                <AnimatePresence mode="wait">
                  <motion.img
                    key={current.url}
                    src={current.url}
                    alt={`screenshot ${index + 1}`}
                    loading="lazy"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ maxWidth: "100%", maxHeight: "55vh", borderRadius: "var(--radius-md)", objectFit: "contain" }}
                  />
                </AnimatePresence>
              ) : (
                <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
                  {canCrud ? "Add a chart screenshot to this trade" : "No screenshots on this trade"}
                </span>
              )}

              {images.length > 1 && (
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
            {images.length > 0 && (
              <div style={{ display: "flex", gap: "var(--space-2)", padding: "var(--space-3) var(--space-6)", borderTop: "1px solid var(--color-border)", overflowX: "auto" }}>
                {images.map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.url}
                    src={img.url}
                    alt={`thumb ${i + 1}`}
                    loading="lazy"
                    onClick={() => setIndex(i)}
                    style={{
                      width: 72, height: 48, objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "pointer",
                      outline: i === index ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      opacity: i === index ? 1 : 0.7,
                    }}
                  />
                ))}
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
