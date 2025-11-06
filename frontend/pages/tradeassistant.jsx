// pages/coming-soon.jsx
import { useEffect } from "react";
import Head from "next/head";
import { FaRobot } from "react-icons/fa";
import { motion } from "framer-motion";
import BottomBar from "@/components/Trades/BottomBar";

export default function ComingSoon() {
  useEffect(() => {
    document.body.style.backgroundColor = "#000000";
    document.body.style.color = "#ffffff";

    return () => {
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    };
  }, []);

  return (
    <>
      <div
        style={{
          height: "80vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
          backgroundColor: "#000000",
          color: "#fff",
          textAlign: "center",
          width: "350px",
          margin: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flexClm flex_center gap_8"
        >
          <div className="flexRow gap_12">
            <FaRobot className="font_32 vector" />
            <h1 className="marg_0 font_32">Coming Soon</h1>
          </div>

          <p className="marg_0 shade_50 font_16">
            We’re working hard to bring something amazing to you.
          </p>
        </motion.div>
      </div>
      <BottomBar />
    </>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
// import { getPlanRules } from "@/utils/planRestrictions";
// import { motion } from "framer-motion";
// import { RefreshCw, Sparkles } from "lucide-react";
// import Head from "next/head";

// const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// export default function AIInsightsPage() {
//   const [userData, setUserData] = useState(null);
//   const [aiAnalysis, setAiAnalysis] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
//   const [canUseAI, setCanUseAI] = useState(false);

//   useEffect(() => {
//     (async () => {
//       const storedUser = await getFromIndexedDB("user-data");
//       setUserData(storedUser);
//       const rules = getPlanRules(storedUser);
//       setCanUseAI(rules.aiPrompts > 0 || rules.aiPrompts === Infinity);

//       const cachedAnalysis = await getFromIndexedDB("ai-analysis");
//       if (cachedAnalysis) {
//         setAiAnalysis(cachedAnalysis);
//         setLoading(false);
//       } else {
//         await generateAIAnalysis(storedUser);
//       }
//     })();
//   }, []);

//   const generateAIAnalysis = async (user) => {
//     try {
//       setLoading(true);
//       const trades = user?.trades || [];
//       if (!trades.length) {
//         setAiAnalysis({ error: "No trades found to analyze." });
//         setLoading(false);
//         return;
//       }

//       const res = await fetch(`${API_BASE}/api/trades/trade-chat`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           query:
//             "Analyze my overall trading performance, win rate, risk management, and common patterns. Write it in a short analytical summary.",
//           trades,
//         }),
//       });

//       const data = await res.json();
//       setAiAnalysis({
//         summary: data.reply,
//         generatedAt: new Date().toISOString(),
//       });
//       await saveToIndexedDB("ai-analysis", {
//         summary: data.reply,
//         generatedAt: new Date().toISOString(),
//       });
//     } catch (err) {
//       setAiAnalysis({ error: "Failed to generate analysis. Try again later." });
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRefresh = async () => {
//     if (!canUseAI) return;
//     setRefreshing(true);
//     await generateAIAnalysis(userData);
//     setRefreshing(false);
//   };

//   // Local stats
//   const trades = userData?.trades || [];
//   const totalTrades = trades.length;
//   const wins = trades.filter((t) => t.pnl > 0).length;
//   const losses = totalTrades - wins;
//   const winRate = totalTrades ? ((wins / totalTrades) * 100).toFixed(1) : 0;
//   const totalPnL = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
//   const mostTradedSymbol = trades
//     .map((t) => t.symbol)
//     .reduce(
//       (a, b, i, arr) =>
//         arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length
//           ? a
//           : b,
//       "-"
//     );

//   return (
//     <>
//       <Head>
//         <title>JournalX | AI Trade Insights</title>
//       </Head>

//       <div className="aiInsightsContainer">
//         {/* Header */}
//         <div className="aiHeader flexRow flexBetween">
//           <div className="flexRow gap_10">
//             <Sparkles size={22} className="textPrimary" />
//             <h1>AI Trade Insights</h1>
//           </div>
//           {canUseAI ? (
//             <button
//               className="button_prim flexRow gap_8"
//               onClick={handleRefresh}
//               disabled={refreshing}
//             >
//               <RefreshCw size={16} className={refreshing ? "spin" : ""} />
//               {refreshing ? "Refreshing..." : "Refresh"}
//             </button>
//           ) : (
//             <button
//               className="button_sec flexRow gap_8"
//               onClick={() => (window.location.href = "/pricing")}
//             >
//               Upgrade Plan
//             </button>
//           )}
//         </div>

//         {/* Stats */}
//         <motion.div
//           className="statsGrid"
//           initial={{ opacity: 0, y: 10 }}
//           animate={{ opacity: 1, y: 0 }}
//           transition={{ duration: 0.4 }}
//         >
//           <div className="statCard">
//             <h3>{totalTrades}</h3>
//             <p>Total Trades</p>
//           </div>
//           <div className="statCard">
//             <h3>{winRate}%</h3>
//             <p>Win Rate</p>
//           </div>
//           <div className="statCard">
//             <h3>{mostTradedSymbol}</h3>
//             <p>Most Traded Symbol</p>
//           </div>
//           <div className="statCard">
//             <h3>{totalPnL.toFixed(2)}</h3>
//             <p>Total PnL</p>
//           </div>
//         </motion.div>

//         {/* AI Summary */}
//         <motion.div
//           className="aiSummarySection"
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           transition={{ delay: 0.3 }}
//         >
//           <h2>AI Analysis Summary</h2>
//           {loading ? (
//             <div className="loadingMessage">Analyzing your trades...</div>
//           ) : aiAnalysis?.error ? (
//             <p className="errorText">{aiAnalysis.error}</p>
//           ) : (
//             <p className="aiSummaryText">{aiAnalysis?.summary}</p>
//           )}
//         </motion.div>
//       </div>
//     </>
//   );
// }
