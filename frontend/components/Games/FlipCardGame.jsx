// components/games/FlipCardGame.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Trophy } from "lucide-react";

const tradingPairs = [
  { id: 1, symbol: "BTC/USD", icon: "₿" },
  { id: 2, symbol: "ETH/USD", icon: "Ξ" },
  { id: 3, symbol: "AAPL", icon: "🍎" },
  { id: 4, symbol: "GOOGL", icon: "G" },
  { id: 5, symbol: "EUR/USD", icon: "€" },
  { id: 6, symbol: "GBP/USD", icon: "£" },
];

const FlipCardGame = ({ onComplete, onBack }) => {
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = () => {
    const duplicatedCards = [...tradingPairs, ...tradingPairs].map(
      (card, index) => ({
        ...card,
        uniqueId: index,
      }),
    );
    const shuffled = duplicatedCards.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameComplete(false);
  };

  const handleCardClick = (uniqueId) => {
    if (
      flipped.length === 2 ||
      flipped.includes(uniqueId) ||
      matched.includes(uniqueId)
    )
      return;

    const newFlipped = [...flipped, uniqueId];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);

      const card1 = cards.find((c) => c.uniqueId === newFlipped[0]);
      const card2 = cards.find((c) => c.uniqueId === newFlipped[1]);

      if (card1.id === card2.id) {
        setMatched([...matched, newFlipped[0], newFlipped[1]]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  };

  useEffect(() => {
    if (matched.length === cards.length && cards.length > 0) {
      setGameComplete(true);
      const score = Math.max(0, 100 - moves * 5);
      onComplete?.(score);
    }
  }, [matched, cards.length, moves, onComplete]);

  return (
    <div className="flexClm gap_24 stats-card" style={{ padding: "24px" }}>
      {/* Header */}
      <div className="flexRow flexRow_stretch">
        <div>
          <h2 style={{ margin: 0 }}>Flip & Match</h2>
          <p style={{ margin: "4px 0 0", opacity: 0.7 }}>Match trading pairs</p>
        </div>
        <div className="flexRow gap_12">
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
            flipped.includes(card.uniqueId) || matched.includes(card.uniqueId);

          return (
            <motion.div
              key={card.uniqueId}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(card.uniqueId)}
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
                    background: "var(--primary)",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "24px",
                    fontWeight: "bold",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  ?
                </div>

                {/* Back */}
                <div
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    backfaceVisibility: "hidden",
                    background: "var(--card-bg)",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "rotateY(180deg)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                >
                  <span style={{ fontSize: "20px", marginBottom: "4px" }}>
                    {card.icon}
                  </span>
                  <span style={{ fontSize: "11px", fontWeight: 600 }}>
                    {card.symbol}
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
            }}
          >
            <Trophy size={32} className="success" />
            <h3>Congratulations!</h3>
            <p>You completed the game in {moves} moves</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlipCardGame;
