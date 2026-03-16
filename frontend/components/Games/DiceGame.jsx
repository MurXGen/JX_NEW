// components/games/DiceGame.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dice1,
  Dice2,
  Dice3,
  Dice4,
  Dice5,
  Dice6,
  RefreshCw,
} from "lucide-react";

const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const DiceGame = ({ onComplete, onBack }) => {
  const [dice, setDice] = useState([1, 1]);
  const [rolling, setRolling] = useState(false);
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);

  const rollDice = () => {
    if (rolling || rounds >= 5) return;

    setRolling(true);

    setTimeout(() => {
      const newDice = [
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ];
      setDice(newDice);

      // Calculate score
      const roundScore = newDice[0] + newDice[1];
      if (newDice[0] === newDice[1]) {
        setScore((s) => s + roundScore * 2); // Double for pairs
      } else {
        setScore((s) => s + roundScore);
      }

      setRounds((r) => r + 1);
      setRolling(false);
    }, 500);
  };

  const resetGame = () => {
    setDice([1, 1]);
    setScore(0);
    setRounds(0);
    setRolling(false);
  };

  if (rounds >= 5) {
    onComplete?.(score);
  }

  return (
    <div
      className="flexClm gap_24 stats-card"
      style={{ padding: "24px", textAlign: "center" }}
    >
      <h2>Dice Roll</h2>
      <p style={{ opacity: 0.7 }}>Roll the dice and score points! (5 rounds)</p>

      {/* Dice Display */}
      <div
        className="flexRow gap_24"
        style={{ justifyContent: "center", margin: "20px 0" }}
      >
        {dice.map((value, index) => {
          const Icon = diceIcons[value - 1];
          return (
            <motion.div
              key={index}
              animate={rolling ? { rotate: 360 } : {}}
              transition={{ duration: 0.5, repeat: rolling ? Infinity : 0 }}
              style={{
                width: "80px",
                height: "80px",
                background: "var(--card-bg)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--primary)",
              }}
            >
              <Icon size={40} className="primary" />
            </motion.div>
          );
        })}
      </div>

      {/* Score and Rounds */}
      <div className="flexRow gap_16" style={{ justifyContent: "center" }}>
        <div className="stats-card" style={{ padding: "8px 20px" }}>
          <span>Score: {score}</span>
        </div>
        <div className="stats-card" style={{ padding: "8px 20px" }}>
          <span>Round: {rounds}/5</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flexRow gap_12" style={{ justifyContent: "center" }}>
        <button
          onClick={rollDice}
          disabled={rolling || rounds >= 5}
          className="primary-btn"
          style={{ padding: "12px 32px" }}
        >
          {rolling ? "Rolling..." : rounds >= 5 ? "Game Over" : "Roll Dice"}
        </button>
        <button
          onClick={resetGame}
          className="btn secondary-btn"
          style={{ padding: "12px" }}
        >
          <RefreshCw size={20} />
        </button>
      </div>
    </div>
  );
};

export default DiceGame;
