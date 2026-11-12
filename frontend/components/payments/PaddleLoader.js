// components/PaddleLoader.js
"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/* Confirm a completed checkout on our server. A subscription's first charge is
   often still settling when checkout.completed fires (the server answers 202
   "pending"), so keep asking with backoff for ~2 minutes instead of once. The
   webhook remains the backstop. Result is broadcast as "jx-paddle-verified". */
const VERIFY_DELAYS = [0, 3000, 5000, 8000, 12000, 15000, 20000, 30000, 30000];
function verifyWithRetry(txnId) {
  const announce = (detail) => {
    try { window.dispatchEvent(new CustomEvent("jx-paddle-verified", { detail })); } catch {}
  };
  let i = 0;
  const attempt = () => {
    fetch(`${API_BASE}/api/subscription/paddle-verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: txnId }),
    })
      .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }))
      .then(({ status, body }) => {
        if (status === 200 && (body.success || body.plan)) return announce({ ok: true, ...body });
        if (status === 401 || status === 403) return announce({ ok: false, status, ...body }); // not retryable
        next(); // 202 pending, 5xx: try again
      })
      .catch(() => next());
  };
  const next = () => {
    i += 1;
    if (i >= VERIFY_DELAYS.length) return announce({ ok: false, pending: true });
    setTimeout(attempt, VERIFY_DELAYS[i]);
  };
  attempt();
}

export default function PaddleLoader() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      {/* Debug */}
      <Script
        id="paddle-debug-pre"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            console.log("🔍 PRE-LOAD: window.Paddle =", window.Paddle);
            console.log("🔍 PRE-LOAD: client token =", "${token}");
          `,
        }}
      />

      {/* Load Paddle.js */}
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("📦 Paddle script loaded");

          let attempts = 0;
          const maxAttempts = 10;

          const waitForPaddle = setInterval(() => {
            attempts++;

            if (window.Paddle) {
              try {
                if (isDev) {
                  window.Paddle.Environment.set("sandbox");
                  console.log("🟨 Sandbox mode");
                } else {
                  window.Paddle.Environment.set("production");
                  console.log("🟩 Live mode");
                }

                window.Paddle.Initialize({
                  token,
                  // Paddle Billing fires events here (not via Checkout.open
                  // callbacks). When checkout completes we verify the
                  // transaction server-side so the plan updates reliably even
                  // if the webhook is delayed/undelivered.
                  eventCallback: (event) => {
                    try {
                      // Bridge every Paddle event to a window event so UI
                      // components (e.g. the inline PaymentModal) can react, 
                      // Paddle Billing only allows one global event callback.
                      try {
                        window.dispatchEvent(
                          new CustomEvent("jx-paddle", { detail: event })
                        );
                      } catch (e) {}
                      if (event?.name === "checkout.completed") {
                        const txnId =
                          event?.data?.transaction_id || event?.data?.id;
                        console.log("✅ checkout.completed, verifying txn", txnId);
                        if (txnId) verifyWithRetry(txnId);
                      }
                    } catch (e) {
                      console.error("eventCallback error", e);
                    }
                  },
                });

                console.log("🎉 Paddle initialized");
              } catch (err) {
                console.error("❌ Paddle initialization failed:", err);
              }

              clearInterval(waitForPaddle);
              return;
            }

            if (attempts >= maxAttempts) {
              console.error("❌ Paddle did not load");
              clearInterval(waitForPaddle);
            }
          }, 200);
        }}
        onError={() => {
          console.error("❌ Failed to load Paddle script");
        }}
      />
    </>
  );
}
