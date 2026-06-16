// components/PaddleLoader.js
"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

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
                      if (event?.name === "checkout.completed") {
                        const txnId =
                          event?.data?.transaction_id || event?.data?.id;
                        console.log("✅ checkout.completed — verifying txn", txnId);
                        if (txnId) {
                          fetch(`${API_BASE}/api/subscription/paddle-verify`, {
                            method: "POST",
                            credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ transactionId: txnId }),
                          })
                            .then((r) => r.json())
                            .then((d) => console.log("paddle-verify:", d))
                            .catch((e) => console.error("paddle-verify failed", e));
                        }
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
