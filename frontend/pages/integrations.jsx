"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { SiBinance } from "react-icons/si";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export default function IntegrationsPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [trades, setTrades] = useState([]);
  const [previewReady, setPreviewReady] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const savedApiKey = localStorage.getItem("binance_api_key");
    const savedSecretKey = localStorage.getItem("binance_secret_key");
    const savedLastSync = localStorage.getItem("binance_last_sync");

    if (savedApiKey) setApiKey(savedApiKey);
    if (savedSecretKey) setSecretKey(savedSecretKey);
    if (savedLastSync) setLastSyncTime(savedLastSync);

    // Listen for background sync updates
    const handleSyncComplete = (event) => {
      setLastSyncTime(event.detail.lastSync);
    };

    window.addEventListener("binanceSyncCompleted", handleSyncComplete);

    return () => {
      window.removeEventListener("binanceSyncCompleted", handleSyncComplete);
    };
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      setFetchStatus("fetching");

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/binance/preview`,
        { apiKey, secretKey },
        { withCredentials: true },
      );

      setTrades(res.data.trades || []);

      if (res.data.trades?.length) {
        await importTrades(res.data.trades);
      } else {
        alert("No trades found to import.");
        setFetchStatus("");
        setLoading(false);
      }
    } catch (err) {
      alert("Failed to fetch trades");
      setFetchStatus("");
      setLoading(false);
    }
  };

  const importTrades = async (tradesToImport) => {
    try {
      setImporting(true);
      setFetchStatus("importing");

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/binance/import`,
        { trades: tradesToImport },
        { withCredentials: true },
      );

      const { imported } = res.data;

      if (imported > 0) {
        setFetchStatus("success");

        const syncTime = new Date().toISOString();
        localStorage.setItem("binance_last_sync", syncTime);
        setLastSyncTime(syncTime);

        setTimeout(() => {
          router.push("/accounts");
        }, 1500);
      } else {
        alert("⚠️ No new trades were imported.");
        setFetchStatus("");
        setShowModal(false);
        setPreviewReady(false);
        setTrades([]);
        setLoading(false);
        setImporting(false);
      }
    } catch (err) {
      console.error("Import error:", err);
      const errorMessage =
        err.response?.data?.message || "Import failed. Please try again.";
      alert(`❌ ${errorMessage}`);
      setFetchStatus("");
      setLoading(false);
      setImporting(false);
    }
  };

  const handleApiKeyChange = (e) => {
    const value = e.target.value;
    setApiKey(value);
    localStorage.setItem("binance_api_key", value);
  };

  const handleSecretKeyChange = (e) => {
    const value = e.target.value;
    setSecretKey(value);
    localStorage.setItem("binance_secret_key", value);
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="pad_16 flexClm gap_24">
      <div>
        <h2 style={{ margin: "0" }}>Integrations</h2>
        <p style={{ margin: "0" }} className="font_14 black-text">
          Connect your exchange accounts to automatically import trades.
        </p>
      </div>

      {/* Last Updated Display */}
      <div className="flexRow gap_12">
        <div className="flexRow flexRow_stretch width100">
          <strong className="font_14">Last Auto-Sync:</strong>{" "}
          <span style={{ opacity: 0.8 }} className="font_14">
            {formatLastSync(lastSyncTime)}
          </span>
          {!lastSyncTime && (
            <span
              className="font_14"
              style={{ marginLeft: "8px", opacity: 0.5 }}
            >
              (Waiting for first sync)
            </span>
          )}
        </div>
      </div>

      <div
        onClick={() => setShowModal(true)}
        className="stats-card radius-12 flexRow flexRow_stretch"
      >
        <div className="flexRow gap_12">
          <SiBinance size={32} color="#F3BA2F" />
          <div className="flexClm">
            <strong>Binance</strong>
            <span style={{ fontSize: "13px", opacity: 0.7 }}>
              Import Spot & Futures trades
            </span>
          </div>
        </div>
        <ArrowRight size={16} />
      </div>

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="boxBg flexClm gap_24" style={{ width: "80%" }}>
            <h3 className="font_24" style={{ margin: "0" }}>
              Connect Binance
            </h3>

            {!previewReady &&
              fetchStatus !== "fetching" &&
              fetchStatus !== "importing" &&
              fetchStatus !== "success" && (
                <>
                  <div className="flexClm gap_24">
                    <input
                      placeholder="API Key"
                      value={apiKey}
                      onChange={handleApiKeyChange}
                    />

                    <input
                      placeholder="Secret Key"
                      value={secretKey}
                      onChange={handleSecretKeyChange}
                    />
                  </div>

                  <p className="font_14" style={{ margin: "0" }}>
                    JournalX will only read your trade history.
                  </p>

                  <div className="flexRow width100 gap_12">
                    <button
                      onClick={fetchTrades}
                      disabled={loading}
                      className="primary-btn width100"
                    >
                      {loading ? "Fetching trades..." : "Fetch My Trades"}
                    </button>

                    <button
                      onClick={() => {
                        setShowModal(false);
                        setPreviewReady(false);
                        setTrades([]);
                        setFetchStatus("");
                      }}
                      className="primary-btn secondary-btn width100"
                      disabled={
                        fetchStatus === "importing" ||
                        fetchStatus === "fetching"
                      }
                    >
                      Close
                    </button>
                  </div>
                </>
              )}

            {fetchStatus === "fetching" && (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div
                  className="spinner"
                  style={{ margin: "0 auto 16px" }}
                ></div>
                <p>Fetching trades from Binance...</p>
              </div>
            )}

            {fetchStatus === "importing" && (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div
                  className="spinner"
                  style={{ margin: "0 auto 16px" }}
                ></div>
                <p>Importing trades to your journal...</p>
              </div>
            )}

            {fetchStatus === "success" && (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                <p style={{ fontSize: "18px", fontWeight: "600" }}>
                  Trades imported successfully!
                </p>
                <p style={{ fontSize: "14px", opacity: 0.7, marginTop: "8px" }}>
                  Redirecting to accounts...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
