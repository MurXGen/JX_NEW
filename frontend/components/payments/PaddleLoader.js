"use client";
import Script from "next/script";

export default function PaddleLoader() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (!window.Paddle) return;

          try {
            window.Paddle.Initialize({ token });
            console.log("✅ Paddle LIVE initialized");
          } catch (err) {
            console.error("❌ Paddle init failed:", err);
          }
        }}
      />
    </>
  );
}
