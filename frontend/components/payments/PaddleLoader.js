// components/PaddleLoader.js
import Script from "next/script";

export default function PaddleLoader() {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  const isDev = process.env.NODE_ENV === "development";

  return (
    <>
      {/* Debug before script */}
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
          console.log("🧪 Checking window.Paddle:", window.Paddle);

          if (!token) {
            console.error(
              "❌ ERROR: NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is missing!"
            );
          }

          let attempts = 0;
          const maxAttempts = 10;

          const waitForPaddle = setInterval(() => {
            attempts++;

            if (window.Paddle) {
              console.log("✅ Paddle object available:", window.Paddle);

              try {
                // 🟡 Set sandbox mode manually (instead of passing `environment`)
                if (isDev) {
                  window.Paddle.Environment.set("sandbox");
                  console.log("🟨 Sandbox mode enabled");
                }

                // 🟢 Initialize Paddle
                window.Paddle.Initialize({ token });
                console.log("🎉 Paddle initialized with token:", token);
              } catch (err) {
                console.error("❌ Paddle initialization failed:", err);
              }

              clearInterval(waitForPaddle);
              return;
            }

            console.warn(`⏳ Waiting for Paddle... attempt ${attempts}`);

            if (attempts >= maxAttempts) {
              console.error("❌ Paddle did not load after maximum retries");
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
