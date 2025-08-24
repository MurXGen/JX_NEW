import React, { useEffect, useState } from "react";
import { getFromIndexedDB, saveToIndexedDB } from "@/utils/indexedDB";
import { useRouter } from "next/router";
import axios from 'axios';

const TRADE_KEY = "__t_rd_iD";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const TradeInfo = ({ onClose }) => {
    const [trade, setTrade] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const fetchTrade = async () => {
            const tradeId = localStorage.getItem(TRADE_KEY);
            if (!tradeId) return;

            const userData = await getFromIndexedDB("user-data");
            const tradeData = userData?.trades?.find((t) => t._id === tradeId);
            setTrade(tradeData);
        };

        fetchTrade();
    }, []);

    if (!trade) return null;

    // --- Handlers ---
    const handleEdit = () => {
        router.push("/add-trade?mode=edit");
    };

    const handleCloseTrade = () => {
        router.push("/add-trade?mode=close");
    };

    const handleDeleteTrade = async (trade) => {
        try {
            const tradeId = localStorage.getItem("__t_rd_iD");

            const res = await axios.delete(`${API_BASE}/api/trades/delete`, {
                withCredentials: true,
                headers: {
                    "x-trade-id": tradeId,
                },
            });

            if (res.data.success) {
                const { accounts, trades } = res.data;

                console.log("💾 Syncing updated data into IndexedDB:", {
                    accountsCount: accounts?.length || 0,
                    tradesCount: trades?.length || 0,
                });

                await saveToIndexedDB("user-data", {
                    userId: localStorage.getItem("userId"),
                    accounts,
                    trades,
                });

                alert("Trade deleted successfully!");

                // 🔄 Refresh the page
                window.location.reload();
            } else {
                alert("❌ Failed to delete trade!");
            }
        } catch (err) {
            console.error("❌ Error deleting trade:", err);
            alert("Something went wrong while deleting trade.");
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded w-[600px] max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-3">
                    {trade.symbol} ({trade.direction})
                </h2>

                <p><strong>Quantity:</strong> {trade.quantityUSD} USD</p>
                <p><strong>Leverage:</strong> {trade.leverage}x</p>
                <p><strong>Total Quantity:</strong> {trade.totalQuantity}</p>
                <p><strong>Duration:</strong> {trade.duration || "N/A"} hrs</p>

                {trade.tradeStatus === "closed" ? (
                    <>
                        <p><strong>Avg Entry Price:</strong> {trade.avgEntryPrice}</p>
                        <p><strong>Avg Exit Price:</strong> {trade.avgExitPrice}</p>
                        <p><strong>PnL:</strong> {trade.pnl}</p>
                    </>
                ) : (
                    <>
                        <p><strong>Avg Entry Price:</strong> {trade.avgEntryPrice}</p>
                        <p><strong>Avg SL:</strong> {trade.avgSLPrice}</p>
                        <p><strong>Avg TP:</strong> {trade.avgTPPrice}</p>
                        <p><strong>Expected Profit:</strong> {trade.expectedProfit}</p>
                        <p><strong>Expected Loss:</strong> {trade.expectedLoss}</p>
                    </>
                )}

                <p><strong>Open Time:</strong> {new Date(trade.openTime).toLocaleString()}</p>
                {trade.closeTime && (
                    <p><strong>Close Time:</strong> {new Date(trade.closeTime).toLocaleString()}</p>
                )}

                {/* Images */}
                {trade.openImageUrl && (
                    <div className="mt-2">
                        <strong>Open Image:</strong>
                        <img src={trade.openImageUrl} alt="Open" className="mt-1 w-full rounded" />
                    </div>
                )}
                {trade.closeImageUrl && (
                    <div className="mt-2">
                        <strong>Close Image:</strong>
                        <img src={trade.closeImageUrl} alt="Close" className="mt-1 w-full rounded" />
                    </div>
                )}  

                {/* Reason & Learnings */}
                {trade.reason?.length > 0 && (
                    <div className="mt-2">
                        <strong>Reason:</strong>
                        <ul className="list-disc ml-4">
                            {trade.reason.map((r, idx) => (
                                <li key={idx}>{r}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {trade.learnings && (
                    <div className="mt-2">
                        <strong>Learnings:</strong>
                        <p>{trade.learnings}</p>
                    </div>
                )}

                {/* --- Action Buttons --- */}
                <div className="flex gap-3 mt-4">
                    {/* Edit is always shown */}
                    <button
                        onClick={handleEdit}
                        className="px-4 py-2 bg-blue-500 text-white rounded"
                    >
                        Edit
                    </button>

                    {/* Show Close if running */}
                    {trade.tradeStatus === "running" && (
                        <button
                            onClick={handleCloseTrade}
                            className="px-4 py-2 bg-yellow-500 text-white rounded"
                        >
                            Close
                        </button>
                    )}

                    {/* Delete always shown */}
                    <button
                        onClick={handleDeleteTrade}
                        className="px-4 py-2 bg-red-500 text-white rounded"
                    >
                        Delete
                    </button>
                </div>

                {/* Close Modal */}
                <button
                    onClick={onClose}
                    className="mt-4 px-4 py-2 bg-gray-400 text-white rounded"
                >
                    Close Modal
                </button>
            </div>
        </div>
    );
};

export default TradeInfo;
