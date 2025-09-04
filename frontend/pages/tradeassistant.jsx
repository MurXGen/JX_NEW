"use client";

import { useState, useRef, useEffect } from "react";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { Send, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function TradeAssistant() {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // predefined quick prompts
    const quickPrompts = [
        "Analyse my last trade",
        "Summarise my trading performance",
        "What's my win rate?",
        "Identify my most traded symbol",
        "Show my average R:R ratio",
        "Highlight my biggest win and loss",
        "List common reasons I lose trades",
        "Suggest improvements to my strategy",
        "Analyse risk management consistency",
        "Give me psychological insights from notes",
    ];

    // Scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="flexClm" style={{ height: "100vh", background: "var(--base-bg)", color: "var(--base-text)" }}>
            {/* Header */}
            <div className="flexRow flexRow_stretch" style={{ padding: "var(--px-16)", borderBottom: "1px solid var(--white-10)" }}>
                <h1 className="font_20" style={{ margin: 0 }}>AI Trade Assistant</h1>
            </div>

            {/* Main Content */}
            <div className="flexClm" style={{ flex: 1, overflow: "hidden" }}>
                {/* Messages Container */}
                <div
                    className="flexClm removeScrollBar"
                    style={{
                        flex: 1,
                        padding: "var(--px-16)",
                        gap: "var(--px-16)"
                    }}
                >
                    <AnimatePresence>
                        {messages.length === 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flexClm flex_center"
                                style={{marginTop:'24px',textAlign: "center", gap: "var(--px-16)", color: "var(--white-50)" }}
                            >
                                <Bot size={48} color="var(--primary)" />
                                <p className="font_16">Ask AI about your trades</p>

                                {/* Quick Prompts Grid */}
                                <div
                                    className="gridContainer"
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                        gap: "var(--px-8)",
                                        maxWidth: "600px",
                                        width: "100%",
                                        marginTop: "var(--px-16)"
                                    }}
                                >
                                    {quickPrompts.map((q, i) => (
                                        <motion.button
                                            key={i}
                                            whileHover={{ scale: 0.98 }}
                                            whileTap={{ scale: 0.95 }}
                                            className="quickPromptButton"
                                            onClick={() => handleSubmit(q)}
                                            style={{
                                                padding: "var(--px-12) var(--px-16)",
                                                borderRadius: "var(--px-12)",
                                                background: "var(--white-4)",
                                                border: "1px solid var(--white-10)",
                                                color: "var(--base-text)",
                                                fontSize: "var(--px-12)",
                                                textAlign: "left",
                                                cursor: "pointer",
                                                transition: "all 0.2s ease",
                                                fontFamily: "var(--ff-Pop)"
                                            }}
                                        >
                                            {q}
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {messages.map((m, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`message ${m.role === "user" ? "userMessage" : "assistantMessage"}`}
                                style={{
                                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                    maxWidth: "80%",
                                    padding: "var(--px-12) var(--px-16)",
                                    borderRadius: "var(--px-12)",
                                    background: m.role === "user" ? "var(--primary)" : "var(--base-box-bg)",
                                    border: m.role === "assistant" ? "1px solid var(--white-10)" : "none"
                                }}
                            >
                                <p style={{ margin: 0, fontSize: "var(--px-14)", lineHeight: "1.4" }}>{m.content}</p>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {loading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flexRow gap_8"
                            style={{ alignSelf: "flex-start", padding: "var(--px-12) var(--px-16)", background: "var(--base-box-bg)", borderRadius: "var(--px-12)" }}
                        >
                            <div className="thinkingDots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className="font_14">Thinking...</span>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Container - Fixed at Bottom */}
            <div
                className="popups_btm" style={{width:'90%'}}
            >
                <div
                    className="chatBox flexRow gap_12 flex_center" style={{padding:'16px 24px'}}
                >
                    <Bot size={20} color="var(--primary)" />

                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask AI about your trades"
                        style={{
                            flex: 1,
                            border: "none",
                            background: "transparent",
                            outline: "none",
                            color: "var(--base-text)",
                            fontSize: "var(--px-14)",
                            padding: "var(--px-8) 0"
                        }}
                    />

                    <button
                        onClick={() => handleSubmit()}
                        disabled={loading || !input.trim()}
                        className="sendButton"
                        style={{
                            background: "var(--primary)",
                            borderRadius: "var(--px-8)",
                            padding: "var(--px-8)",
                            border: "none",
                            color: "var(--base-text)",
                            cursor: input.trim() ? "pointer" : "not-allowed",
                            opacity: input.trim() ? 1 : 0.5,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}