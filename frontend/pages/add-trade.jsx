"use client";

import { useState } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, PlusCircle } from "lucide-react";

import { Button, TradeLogForm, LogTradeModal } from "@/components/revampV2";

/**
 * /add-trade — revamp v2 trade log.
 * The Figma "Log Trade" modal opens automatically on this page
 * (Quick log / Detailed). Submit is a dummy for now.
 */
export default function AddTradePage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="jx-shell" style={{ justifyContent: "center" }}>
      <main
        className="jx-shell__main"
        style={{ maxWidth: 880, width: "100%" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => router.push("/dashboard")}
          >
            Dashboard
          </Button>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ font: "var(--text-h2)" }}>Log a trade</span>
            <span style={{ font: "var(--text-body)", color: "var(--color-text-muted)" }}>
              Record your execution, reasoning and screenshots
            </span>
          </div>
        </div>

        <TradeLogForm />
      </main>

      {/* Figma "Log Trade" modal — auto-opens when landing on this page */}
      <LogTradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onNoJournal={() => router.push("/accounts")}
        onSaved={(trade) => console.log("[add-trade] trade saved:", trade?._id)}
      />

      {/* Reopen button once closed */}
      {!modalOpen && (
        <Button
          variant="primary"
          icon={PlusCircle}
          onClick={() => setModalOpen(true)}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            boxShadow: "var(--shadow-lg)",
            zIndex: 50,
          }}
        >
          Log trade
        </Button>
      )}
    </div>
  );
}
