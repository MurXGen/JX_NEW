// pages/games.jsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gamepad2,
  Dice1,
  Trophy,
  Brain,
  Sparkles,
  ArrowLeft,
  TrendingUp,
  Target,
  Puzzle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import FlipCardGame from "@/components/Games/FlipCardGame";
import DiceGame from "@/components/Games/DiceGame";
import TradingQuiz from "@/components/Games/TradingQuiz";
import MemoryMatch from "@/components/games/MemoryMatch";
import QuickMath from "@/components/games/QuickMath";

const games = [
  {
    id: "flipcard",
    name: "Flip & Match",
    icon: <Puzzle size={24} />,
    description: "Test your memory by matching trading pairs",
    color: "#3b82f6",
    bgColor: "rgba(59, 130, 246, 0.1)",
    component: FlipCardGame,
    difficulty: "Easy",
    time: "2 min",
  },
  {
    id: "dice",
    name: "Dice Roll",
    icon: <Dice1 size={24} />,
    description: "Roll the dice and test your luck",
    color: "#f59e0b",
    bgColor: "rgba(245, 158, 11, 0.1)",
    component: DiceGame,
    difficulty: "Easy",
    time: "1 min",
  },
  {
    id: "quiz",
    name: "Trading Quiz",
    icon: <Brain size={24} />,
    description: "Test your trading knowledge",
    color: "#10b981",
    bgColor: "rgba(16, 185, 129, 0.1)",
    component: TradingQuiz,
    difficulty: "Medium",
    time: "3 min",
  },
  {
    id: "memory",
    name: "Memory Match",
    icon: <Target size={24} />,
    description: "Match patterns like a pro trader",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.1)",
    component: MemoryMatch,
    difficulty: "Hard",
    time: "2 min",
  },
  {
    id: "math",
    name: "Quick Math",
    icon: <Zap size={24} />,
    description: "Fast mental calculations",
    color: "#ec4899",
    bgColor: "rgba(236, 72, 153, 0.1)",
    component: QuickMath,
    difficulty: "Medium",
    time: "1 min",
  },
];

export default function GamesPage() {
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState(null);
  const [score, setScore] = useState(0);
  const [showStats, setShowStats] = useState(false);

  const handleGameSelect = (game) => {
    setSelectedGame(game);
  };

  const handleGameComplete = (finalScore) => {
    setScore(finalScore);
    setShowStats(true);
    setTimeout(() => setShowStats(false), 3000);
  };

  const SelectedGameComponent = selectedGame?.component;

  return (
    <div
      className="flexClm gap_32"
      style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* Header */}
      <div className="flexRow flexRow_stretch">
        <div className="flexRow gap_12" style={{ alignItems: "center" }}>
          <button
            onClick={() =>
              selectedGame ? setSelectedGame(null) : router.back()
            }
            className="btn secondary-btn"
            style={{ padding: "10px" }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 700 }}>
              {selectedGame ? selectedGame.name : "Trading Games"}
            </h1>
            <p style={{ margin: "4px 0 0", opacity: 0.7 }}>
              {selectedGame
                ? "Take a break and have fun!"
                : "Play these games while waiting for market opportunities"}
            </p>
          </div>
        </div>

        {/* Score Display */}
        {selectedGame && (
          <div className="flexRow gap_8" style={{ alignItems: "center" }}>
            <div className="stats-card" style={{ padding: "10px 20px" }}>
              <Trophy size={18} className="primary" />
              <span className="font_16 font_weight_600">Score: {score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Games Grid or Selected Game */}
      <AnimatePresence mode="wait">
        {!selectedGame ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="games-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
              marginTop: "20px",
            }}
          >
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleGameSelect(game)}
                className="stats-card"
                style={{
                  cursor: "pointer",
                  padding: "24px",
                  border: `1px solid ${game.bgColor}`,
                  transition: "all 0.3s",
                }}
                whileHover={{
                  y: -4,
                  boxShadow: `0 10px 25px -5px ${game.color}30`,
                  borderColor: game.color,
                }}
              >
                <div
                  className="flexRow flexRow_stretch"
                  style={{ marginBottom: "16px" }}
                >
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      borderRadius: "16px",
                      background: game.bgColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: game.color,
                    }}
                  >
                    {game.icon}
                  </div>
                  <div className="flexRow gap_4">
                    <span
                      className="badge"
                      style={{
                        background: game.bgColor,
                        color: game.color,
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "11px",
                      }}
                    >
                      {game.difficulty}
                    </span>
                    <span
                      className="badge"
                      style={{
                        background: "var(--black-4)",
                        padding: "4px 8px",
                        borderRadius: "20px",
                        fontSize: "11px",
                      }}
                    >
                      {game.time}
                    </span>
                  </div>
                </div>

                <h3
                  style={{
                    margin: "0 0 8px",
                    fontSize: "18px",
                    fontWeight: 600,
                  }}
                >
                  {game.name}
                </h3>
                <p style={{ margin: 0, fontSize: "13px", opacity: 0.7 }}>
                  {game.description}
                </p>

                <div style={{ marginTop: "16px" }}>
                  <span
                    style={{
                      color: game.color,
                      fontSize: "13px",
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Play now <Sparkles size={14} />
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <SelectedGameComponent
              onComplete={handleGameComplete}
              onBack={() => setSelectedGame(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            style={{
              position: "fixed",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              background: "var(--success)",
              color: "white",
              padding: "12px 24px",
              borderRadius: "40px",
              boxShadow: "0 10px 25px -5px var(--success)",
              zIndex: 1000,
            }}
          >
            <div className="flexRow gap_8" style={{ alignItems: "center" }}>
              <Trophy size={18} />
              <span>Game completed! Score: {score}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
