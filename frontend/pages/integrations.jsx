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
      setPreviewReady(true);
      setFetchStatus("");
      setLoading(false);
    } catch (err) {
      alert("Failed to fetch trades");
      setFetchStatus("");
      setLoading(false);
    }
  };

  const importTrades = async () => {
    if (!trades.length) {
      alert("No trades to import");
      return;
    }

    try {
      setImporting(true);
      setFetchStatus("importing");

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/integrations/binance/import`,
        { trades },
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
        setImporting(false);
      }
    } catch (err) {
      console.error("Import error:", err);
      const errorMessage =
        err.response?.data?.message || "Import failed. Please try again.";
      alert(`❌ ${errorMessage}`);
      setFetchStatus("");
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

  const formatDateTime = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        style={{ cursor: "pointer" }}
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
            zIndex: 1000,
          }}
        >
          <div
            className="boxBg flexClm gap_24"
            style={{ width: "95%", maxWidth: "1200px", padding: "24px" }}
          >
            <h3 className="font_24" style={{ margin: "0" }}>
              Connect Binance
            </h3>

            {!previewReady &&
              fetchStatus !== "fetching" &&
              fetchStatus !== "importing" &&
              fetchStatus !== "success" && (
                <>
                  <div className="flexClm gap_16">
                    <input
                      placeholder="API Key"
                      value={apiKey}
                      onChange={handleApiKeyChange}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                      }}
                    />

                    <input
                      placeholder="Secret Key"
                      value={secretKey}
                      onChange={handleSecretKeyChange}
                      style={{
                        padding: "12px",
                        borderRadius: "8px",
                        border: "1px solid var(--border-color)",
                      }}
                    />
                  </div>

                  <p className="font_14" style={{ margin: "0", opacity: 0.6 }}>
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

            {previewReady &&
              fetchStatus !== "importing" &&
              fetchStatus !== "success" && (
                <>
                  <div className="flexRow flexRow_stretch">
                    <span className="font_16 font_weight_600">
                      Found {trades.length} trades
                    </span>
                  </div>

                  {/* Preview Table - Show ALL trades with dates and fees */}
                  <div
                    style={{
                      maxHeight: "450px",
                      overflow: "auto",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                    }}
                  >
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "13px",
                      }}
                    >
                      <thead
                        style={{
                          position: "sticky",
                          top: 0,
                          background: "var(--card-bg)",
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <tr>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Symbol
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Side
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Open Time
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Close Time
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Entry
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Exit
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Size
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Leverage
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Fees
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            P&L
                          </th>
                          <th
                            style={{ padding: "12px 8px", textAlign: "left" }}
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade, index) => (
                          <tr
                            key={index}
                            style={{
                              borderBottom: "1px solid var(--border-color)",
                            }}
                          >
                            <td
                              style={{ padding: "12px 8px", fontWeight: 600 }}
                            >
                              {trade.symbol}
                            </td>
                            <td
                              style={{
                                padding: "12px 8px",
                                color:
                                  trade.side === "LONG"
                                    ? "var(--success)"
                                    : "var(--error)",
                                fontWeight: 600,
                              }}
                            >
                              {trade.side || "-"}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              {formatDateTime(trade.openTime)}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              {formatDateTime(trade.closeTime)}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              ${trade.entry?.toFixed(2) || "-"}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              ${trade.exit?.toFixed(2) || "-"}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              ${trade.size?.toFixed(2) || "-"}
                            </td>
                            <td style={{ padding: "12px 8px" }}>
                              {trade.leverage ? `${trade.leverage}x` : "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 8px",
                                color: "var(--error)",
                              }}
                            >
                              ${trade.fees?.toFixed(2) || "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 8px",
                                color:
                                  trade.pnl > 0
                                    ? "var(--success)"
                                    : trade.pnl < 0
                                      ? "var(--error)"
                                      : "inherit",
                                fontWeight: 600,
                              }}
                            >
                              {trade.pnl
                                ? `${trade.pnl > 0 ? "+" : ""}${trade.pnl?.toFixed(2)}`
                                : "-"}
                            </td>
                            <td
                              style={{
                                padding: "12px 8px",
                                color:
                                  trade.status === "OPEN"
                                    ? "#f59e0b"
                                    : "#22c55e",
                                fontWeight: 600,
                              }}
                            >
                              {trade.status || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Row - Total Fees */}
                  <div
                    className="flexRow flexRow_stretch"
                    style={{
                      background: "var(--black-4)",
                      padding: "12px",
                      borderRadius: "8px",
                    }}
                  >
                    <span className="font_14 font_weight_600">Total Fees:</span>
                    <span className="font_14 font_weight_600 error">
                      $
                      {trades
                        .reduce((sum, t) => sum + (Number(t.fees) || 0), 0)
                        .toFixed(2)}
                    </span>
                  </div>

                  <div className="flexRow width100 gap_12">
                    <button
                      onClick={importTrades}
                      disabled={importing}
                      className="primary-btn width100"
                    >
                      {importing
                        ? "Importing..."
                        : `Import ${trades.length} Trades`}
                    </button>

                    <button
                      onClick={() => {
                        setShowModal(false);
                        setPreviewReady(false);
                        setTrades([]);
                        setFetchStatus("");
                      }}
                      className="primary-btn secondary-btn width100"
                      disabled={importing}
                    >
                      Cancel
                    </button>
                  </div>
                </>
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
