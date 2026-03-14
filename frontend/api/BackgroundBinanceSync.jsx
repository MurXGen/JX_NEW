// components/BackgroundBinanceSync.jsx
import { useEffect } from "react";
import axios from "axios";

const BackgroundBinanceSync = () => {
  useEffect(() => {
    const syncBinanceTrades = async () => {
      try {
        const apiKey = localStorage.getItem("binance_api_key");
        const secretKey = localStorage.getItem("binance_secret_key");

        if (!apiKey || !secretKey) return;

        console.log("Background sync running at:", new Date().toLocaleString());

        // Fetch preview
        const previewRes = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/binance/preview`,
          { apiKey, secretKey },
          { withCredentials: true },
        );

        if (previewRes.data.trades?.length) {
          // Import trades
          await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/binance/import`,
            { trades: previewRes.data.trades },
            { withCredentials: true },
          );

          // Update last sync time
          const syncTime = new Date().toISOString();
          localStorage.setItem("binance_last_sync", syncTime);

          // Dispatch custom event for UI updates
          window.dispatchEvent(
            new CustomEvent("binanceSyncCompleted", {
              detail: { lastSync: syncTime },
            }),
          );
        }
      } catch (err) {
        console.error("Background sync failed:", err);
      }
    };

    // Run immediately if keys exist
    syncBinanceTrades();

    // Set up interval for every 30 minutes
    const intervalId = setInterval(syncBinanceTrades, 30 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  return null; // This component doesn't render anything
};

export default BackgroundBinanceSync;
