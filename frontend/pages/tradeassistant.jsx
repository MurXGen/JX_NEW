"use client";

import { useState, useRef, useEffect } from "react";
import { getFromIndexedDB } from "@/utils/indexedDB";
import { Send, Bot, ArrowLeft, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ChatResponse from "@/components/Trades/ChatResponse";
import { useRouter } from "next/navigation";
import BackgroundBlur from "@/components/ui/BackgroundBlur";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function TradeAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const router = useRouter();

  // predefined quick prompts
  const quickPrompts = [
    "Analyse my last trade",
    "Summarise my trading performance",
    "What's my win rate?",
    "Identify my most traded symbol",
  ];

  // Scroll to bottom of messages
  // const scrollToBottom = () => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  // };

  // useEffect(() => {
  //   scrollToBottom();
  // }, [messages]);

  const handleSubmit = async (prompt) => {
    setLoading(true);

    const finalPrompt = prompt || input;
    if (!finalPrompt.trim()) {
      setLoading(false);
      return;
    }

    try {
      const userData = await getFromIndexedDB("user-data");
      const trades = userData?.trades || [];

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
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Something went wrong. Try again." },
      ]);
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

  const handleBackClick = () => {
    router.push("/");
  };

  return (
    <div className="tradeAssistantContainer">
      <BackgroundBlur />
      {/* Header with Back Navigation */}
      <motion.div
        className="assistantHeader"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button className="button_sec flexRow" onClick={handleBackClick}>
          <ArrowLeft size={20} />
          <span></span>
        </button>

        <div className="headerContent">
          <div className="aiBadge">
            <Sparkles size={16} />
            <span>JournalX AI Assistant</span>
          </div>
          <h1 className="headerTitle">Trade Intelligence</h1>
          <p className="headerSubtitle">
            Get insights and analysis from your trading data
          </p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="assistantContent">
        {/* Messages Container */}
        <div className="messagesContainer">
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="welcomeSection"
              >
                {/* <div className="welcomeIllustration">
                  <div className="botIconWrapper">
                    <Bot size={48} />
                    <div className="pulseEffect"></div>
                  </div>
                </div>

                <div className="welcomeText">
                  <h2>How can I help with your trades today?</h2>
                  <p>
                    Ask me anything about your trading performance, patterns, or
                    get suggestions for improvement.
                  </p>
                </div> */}

                {/* Quick Prompts Grid */}
                <div className="quickPromptsGrid">
                  {quickPrompts.map((q, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="quickPromptCard"
                      onClick={() => handleSubmit(q)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.1 }}
                    >
                      <span>{q}</span>
                      <div className="promptHoverEffect"></div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Messages */}
            <div className="messagesList">
              {messages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`messageBubble ${
                    m.role === "user" ? "userMessage" : "assistantMessage"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <ChatResponse text={m.content} />
                  ) : (
                    <div className="userMessageContent">
                      <p>{m.content}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="thinkingIndicator"
              >
                <div className="thinkingAnimation">
                  <div className="thinkingDot"></div>
                  <div className="thinkingDot"></div>
                  <div className="thinkingDot"></div>
                </div>
                <span>Analyzing your trades...</span>
              </motion.div>
            )}

            <div ref={messagesEndRef} className="scrollAnchor" />
          </AnimatePresence>
        </div>

        {/* Input Container */}
        <motion.div
          className="inputContainer"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="inputWrapper">
            <div className="inputIcon">
              <Bot size={20} />
            </div>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask anything about your trades..."
              className="chatInput"
              disabled={loading}
            />

            <motion.button
              onClick={() => handleSubmit()}
              disabled={loading || !input.trim()}
              className="sendButton"
              whileHover={{ scale: input.trim() ? 1.05 : 1 }}
              whileTap={{ scale: input.trim() ? 0.95 : 1 }}
            >
              <Send size={18} />
            </motion.button>
          </div>

          <div className="inputHint">Press Enter to send</div>
        </motion.div>
      </div>
    </div>
  );
}
