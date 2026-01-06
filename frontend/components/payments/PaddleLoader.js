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

                window.Paddle.Initialize({ token });

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
