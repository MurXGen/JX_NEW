"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { getFromIndexedDB } from "@/utils/indexedDB";

export default function Home() {
  const router = useRouter();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const loadTrades = async () => {
      const accountId = Cookies.get("accountId");

      if (!accountId) {
        console.warn("⚠ No account selected, redirecting to accounts page...");
        router.push("/accounts");
        return;
      }

      console.log("✅ Using accountId from cookies:", accountId);

      // Fetch user data from IndexedDB
      const userData = await getFromIndexedDB("user-data");

      if (userData) {
        const accountTrades = (userData.trades || []).filter(
          (trade) => trade.accountId === accountId
        );

        console.log("📊 Found trades:", accountTrades);
        setTrades(accountTrades);

        if (accountTrades.length > 0) {
          calculateStats(accountTrades);
        }
      } else {
        console.warn("⚠ No user data found in IndexedDB");
      }

      setLoading(false);
    };

    loadTrades();
  }, [router]);

  const calculateStats = (accountTrades) => {
    const pnlValues = accountTrades.map((t) => t.pnl || 0);

    const maxPnL = Math.max(...pnlValues);
    const maxProfit = Math.max(...pnlValues.filter((p) => p > 0), 0);
    const maxLoss = Math.min(...pnlValues.filter((p) => p < 0), 0);
    const totalTrades = accountTrades.length;

    // last 10 trades streak
    const last10 = accountTrades.slice(-10);
    let streakType = null;
    let streakCount = 0;
    for (let i = last10.length - 1; i >= 0; i--) {
      const result = last10[i].pnl > 0 ? "win" : last10[i].pnl < 0 ? "loss" : "break-even";
      if (!streakType) {
        streakType = result;
        streakCount = 1;
      } else if (streakType === result) {
        streakCount++;
      } else {
        break;
      }
    }

    // unique symbols
    const uniqueSymbols = new Set(accountTrades.map((t) => t.symbol)).size;

    setStats({
      maxPnL,
      maxProfit,
      maxLoss,
      totalTrades,
      streak: `${streakCount} ${streakType || ""}`,
      totalSymbols: uniqueSymbols,
    });
  };

  if (loading) return <p>Loading trades...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h1>Trades</h1>

      {stats && (
        <div style={{ marginBottom: "20px" }}>
          <h2>Statistics</h2>
          <p><strong>Total Trades:</strong> {stats.totalTrades}</p>
          <p><strong>Max PnL:</strong> {stats.maxPnL}</p>
          <p><strong>Max Profit:</strong> {stats.maxProfit}</p>
          <p><strong>Max Loss:</strong> {stats.maxLoss}</p>
          <p><strong>Streak (last 10):</strong> {stats.streak}</p>
          <p><strong>Total Symbols Traded:</strong> {stats.totalSymbols}</p>
        </div>
      )}

      {trades.length > 0 ? (
        <ul>
          {trades.map((trade) => (
            <li key={trade._id} style={{ marginBottom: "10px" }}>
              <span>{trade.symbol || "N/A"} - </span>
              <span
                style={{
                  color:
                    trade.pnl > 0 ? "green" : trade.pnl < 0 ? "red" : "gray",
                }}
              >
                {trade.pnl ?? 0}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No trades found for this account.</p>
      )}
    </div>
  );
}
