// components/games/TradingQuiz.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Trophy } from "lucide-react";

const questions = [
  {
    question: "What does 'Long' mean in trading?",
    options: [
      "Selling an asset",
      "Buying an asset expecting price to rise",
      "Holding for a long time",
      "Taking a break",
    ],
    correct: 1,
  },
  {
    question: "What is a 'Stop Loss'?",
    options: [
      "Taking profits",
      "Order to close trade at a loss limit",
      "Market analysis tool",
      "Trading strategy",
    ],
    correct: 1,
  },
  {
    question: "What is 'Leverage'?",
    options: [
      "Borrowed capital to increase returns",
      "A type of chart",
      "Market indicator",
      "Trading fee",
    ],
    correct: 0,
  },
  {
    question: "What does 'Bear Market' mean?",
    options: [
      "Rising prices",
      "Falling prices",
      "Sideways market",
      "High volatility",
    ],
    correct: 1,
  },
  {
    question: "What is 'Risk Management'?",
    options: [
      "Maximizing profits",
      "Minimizing potential losses",
      "Day trading",
      "Technical analysis",
    ],
    correct: 1,
  },
];

const TradingQuiz = ({ onComplete, onBack }) => {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  const handleAnswer = (index) => {
    if (answered) return;

    setSelected(index);
    setAnswered(true);

    if (index === questions[currentQ].correct) {
      setScore((s) => s + 20);
    }

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ((c) => c + 1);
        setSelected(null);
        setAnswered(false);
      } else {
        setShowResult(true);
        onComplete?.(score + (index === questions[currentQ].correct ? 20 : 0));
      }
    }, 1000);
  };

  const resetQuiz = () => {
    setCurrentQ(0);
    setScore(0);
    setShowResult(false);
    setSelected(null);
    setAnswered(false);
  };

  if (showResult) {
    return (
      <div
        className="flexClm gap_24 stats-card"
        style={{ padding: "40px", textAlign: "center" }}
      >
        <Trophy size={64} className="primary" />
        <h2>Quiz Complete!</h2>
        <p style={{ fontSize: "18px" }}>Your score: {score}/100</p>
        <button
          onClick={resetQuiz}
          className="primary-btn"
          style={{ padding: "12px 32px" }}
        >
          Play Again
        </button>
      </div>
    );
  }

  return (
    <div className="flexClm gap_24 stats-card" style={{ padding: "24px" }}>
      {/* Progress */}
      <div className="flexRow flexRow_stretch">
        <span>
          Question {currentQ + 1}/{questions.length}
        </span>
        <span>Score: {score}</span>
      </div>

      <div
        style={{
          height: "4px",
          background: "var(--black-4)",
          borderRadius: "2px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${((currentQ + 1) / questions.length) * 100}%`,
            background: "var(--primary)",
            borderRadius: "2px",
            transition: "width 0.3s",
          }}
        />
      </div>

      {/* Question */}
      <h3 style={{ margin: "20px 0" }}>{questions[currentQ].question}</h3>

      {/* Options */}
      <div className="flexClm gap_12">
        {questions[currentQ].options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = index === questions[currentQ].correct;
          const showFeedback = answered && isSelected;

          return (
            <motion.button
              key={index}
              whileHover={{ scale: answered ? 1 : 1.02 }}
              whileTap={{ scale: answered ? 1 : 0.98 }}
              onClick={() => handleAnswer(index)}
              disabled={answered}
              style={{
                padding: "16px",
                borderRadius: "12px",
                border: `2px solid ${
                  answered && isSelected
                    ? isCorrect
                      ? "var(--success)"
                      : "var(--error)"
                    : "var(--border-color)"
                }`,
                background:
                  answered && isSelected
                    ? isCorrect
                      ? "var(--success-10)"
                      : "var(--error-10)"
                    : "var(--card-bg)",
                cursor: answered ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
              }}
            >
              <span>{option}</span>
              {answered &&
                isSelected &&
                (isCorrect ? (
                  <Check size={20} className="success" />
                ) : (
                  <X size={20} className="error" />
                ))}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default TradingQuiz;
