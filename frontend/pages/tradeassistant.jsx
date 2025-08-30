"use client";

import { useState } from "react";
import { getFromIndexedDB } from "@/utils/indexedDB"; // your helper
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import BottomBar from "@/components/Trades/BottomBar";

export default function TradeAssistant() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    // predefined quick prompts
    const quickPrompts = [
        "Analyse my last trade",
        "Summarise my trading performance",
        "What’s my win rate?",
        "Identify my most traded symbol",
        "Show my average R:R ratio",
        "Highlight my biggest win and loss",
        "List common reasons I lose trades",
        "Suggest improvements to my strategy",
        "Analyse risk management consistency",
        "Give me psychological insights from notes",
    ];

    const handleSubmit = async (prompt) => {
        setLoading(true);

        // if user typed something, use that; else use the button text
        const finalPrompt = prompt || input;
        if (!finalPrompt) return;

        try {
            const userData = await getFromIndexedDB("user-data");
            const trades = userData?.trades || [];

            // send to your backend route that calls GPT
            const res = await fetch(`${API_BASE}/api/trades/trade-chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: finalPrompt,
                    trades,
                }),
            });


            const data = await res.json();

            setMessages((prev) => [
                ...prev,
                { role: "user", content: finalPrompt },
                { role: "assistant", content: data.reply },
            ]);

            setInput("");
        } catch (err) {
            console.error("❌ Chat error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">📊 AI Trade Assistant</h1>

            <BottomBar/>

            {/* Quick Prompts */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {quickPrompts.map((q, i) => (
                    <Button
                        key={i}
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => handleSubmit(q)}
                    >
                        {q}
                    </Button>
                ))}
            </div>

            {/* Chat Messages */}
            <div className="space-y-3 mb-4 max-h-[400px] overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {messages.map((m, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-2 rounded-lg ${m.role === "user" ? "bg-blue-100 text-right" : "bg-green-100"
                            }`}
                    >
                        {m.content}
                    </motion.div>
                ))}
                {loading && (
                    <div className="italic text-gray-500">Thinking...</div>
                )}
            </div>

            {/* Input Box */}
            <Card className="shadow-md">
                <CardContent className="p-3">
                    <div className="flex gap-2">
                        <Textarea
                            placeholder="Ask something about your trades..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1"
                        />
                        <Button onClick={() => handleSubmit()} disabled={loading}>
                            Send
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
