// components/games/MemoryMatch.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RefreshCw,
  Trophy,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Bitcoin,
  BarChart3,
} from "lucide-react";

const cardIcons = [
  { icon: <TrendingUp size={24} />, name: "Bull", color: "#22c55e" },
  { icon: <TrendingDown size={24} />, name: "Bear", color: "#ef4444" },
  { icon: <DollarSign size={24} />, name: "Dollar", color: "#f59e0b" },
  { icon: <Bitcoin size={24} />, name: "Bitcoin", color: "#f7931a" },
  { icon: <BarChart3 size={24} />, name: "Chart", color: "#3b82f6" },
  { icon: <Trophy size={24} />, name: "Trophy", color: "#8b5cf6" },
];

const MemoryMatch = ({ onComplete, onBack }) => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    initializeGame();
  }, []);

  useEffect(() => {
    let timer;
    if (!gameComplete && cards.length > 0) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameComplete, startTime, cards.length]);

  const initializeGame = () => {
    // Create pairs of cards
    const pairedCards = [...cardIcons, ...cardIcons].map((card, index) => ({
      ...card,
      id: index,
      pairId: Math.floor(index / 2),
      isMatched: false,
    }));

    // Shuffle cards
    const shuffled = pairedCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameComplete(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  const handleCardClick = (id) => {
    if (
      flipped.length === 2 ||
      flipped.includes(id) ||
      matched.includes(id) ||
      gameComplete
    )
      return;

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      const card1 = cards.find((c) => c.id === newFlipped[0]);
      const card2 = cards.find((c) => c.id === newFlipped[1]);

      // Check if cards match (same pairId)
      if (card1.pairId === card2.pairId) {
        setMatched([...matched, newFlipped[0], newFlipped[1]]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setGameComplete(true);
      const score = Math.max(0, 100 - moves * 2 - elapsedTime);
      onComplete?.(score);
    }
  }, [matched, cards.length, moves, elapsedTime, onComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flexClm gap_24 stats-card" style={{ padding: "24px" }}>
      {/* Header */}
      <div className="flexRow flexRow_stretch">
        <div>
          <h2 style={{ margin: 0 }}>Memory Match</h2>
          <p style={{ margin: "4px 0 0", opacity: 0.7 }}>
            Match the trading icons
          </p>
        </div>
        <div className="flexRow gap_12">
          <div className="stats-card" style={{ padding: "8px 16px" }}>
            <span>Time: {formatTime(elapsedTime)}</span>
          </div>
          <div className="stats-card" style={{ padding: "8px 16px" }}>
            <span>Moves: {moves}</span>
          </div>
          <button
            onClick={initializeGame}
            className="btn secondary-btn"
            style={{ padding: "8px 16px" }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Game Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "12px",
          marginTop: "16px",
        }}
      >
        {cards.map((card) => {
          const isFlipped =
            flipped.includes(card.id) || matched.includes(card.id);

          return (
            <motion.div
              key={card.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(card.id)}
              style={{
                aspectRatio: "1",
                cursor: "pointer",
                perspective: "1000px",
              }}
            >
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: "100%",
                  height: "100%",
                  position: "relative",
                  transformStyle: "preserve-3d",
                }}
              >
                {/* Front */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    background:
                      "linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "24px",
                    fontWeight: "bold",
                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                  }}
                >
                  <span style={{ fontSize: "28px" }}>?</span>
                </div>

                {/* Back */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    background: "var(--card-bg)",
                    borderRadius: "16px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotateY(180deg)",
                    border: `2px solid ${card.color}`,
                    boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                  }}
                >
                  <div style={{ color: card.color }}>{card.icon}</div>
                  <span
                    style={{
                      fontSize: "10px",
                      marginTop: "4px",
                      color: card.color,
                    }}
                  >
                    {card.name}
                  </span>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Game Complete */}
      <AnimatePresence>
        {gameComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              textAlign: "center",
              padding: "20px",
              background: "var(--success-10)",
              borderRadius: "16px",
              marginTop: "16px",
            }}
          >
            <Trophy size={32} className="success" />
            <h3 style={{ margin: "8px 0" }}>Memory Master!</h3>
            <p>
              Completed in {moves} moves and {formatTime(elapsedTime)}
            </p>
            <p style={{ fontSize: "18px", fontWeight: 600 }}>
              Score: {Math.max(0, 100 - moves * 2 - elapsedTime)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div style={{ marginTop: "8px" }}>
        <div
          style={{
            height: "4px",
            background: "var(--black-4)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(matched.length / (cards.length || 1)) * 100}%`,
              background: "var(--success)",
              transition: "width 0.3s",
            }}
          />
        </div>
        <p style={{ fontSize: "12px", textAlign: "center", marginTop: "8px" }}>
          {matched.length / 2} / {cards.length / 2} pairs matched
        </p>
      </div>
    </div>
  );
};

export default MemoryMatch;
