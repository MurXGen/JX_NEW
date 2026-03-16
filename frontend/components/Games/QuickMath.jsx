// components/games/QuickMath.jsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Trophy, Zap, Clock } from "lucide-react";

const operations = [
  { symbol: "+", name: "addition", func: (a, b) => a + b },
  { symbol: "-", name: "subtraction", func: (a, b) => a - b },
  { symbol: "×", name: "multiplication", func: (a, b) => a * b },
];

const QuickMath = ({ onComplete, onBack }) => {
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(true);
  const [gameComplete, setGameComplete] = useState(false);
  const [streak, setStreak] = useState(0);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  useEffect(() => {
    generateQuestion();
  }, []);

  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            setGameActive(false);
            setGameComplete(true);
            onComplete?.(score);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameActive, timeLeft, score, onComplete]);

  const generateQuestion = () => {
    const op = operations[Math.floor(Math.random() * operations.length)];
    let a, b, answer;

    switch (op.symbol) {
      case "+":
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        answer = a + b;
        break;
      case "-":
        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * 20) + 1;
        answer = a - b;
        break;
      case "×":
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = a * b;
        break;
      default:
        a = 1;
        b = 1;
        answer = 2;
    }

    setQuestion({ a, b, op: op.symbol, answer });
    setUserAnswer("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!gameActive || !question) return;

    const numAnswer = parseInt(userAnswer);
    const isCorrect = numAnswer === question.answer;

    // Show feedback
    setFeedback({
      correct: isCorrect,
      message: isCorrect
        ? "Correct! +10 points"
        : `Wrong! Answer was ${question.answer}`,
    });

    // Update score and streak
    if (isCorrect) {
      const points = 10 + streak * 2; // Bonus for streaks
      setScore((s) => s + points);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }

    setQuestionsAnswered((q) => q + 1);

    // Clear feedback and generate new question
    setTimeout(() => {
      setFeedback(null);
      generateQuestion();
    }, 1000);
  };

  const resetGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setGameComplete(false);
    setStreak(0);
    setQuestionsAnswered(0);
    setFeedback(null);
    generateQuestion();
  };

  const formatTime = (seconds) => {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
  };

  return (
    <div className="flexClm gap_24 stats-card" style={{ padding: "24px" }}>
      {/* Header */}
      <div className="flexRow flexRow_stretch">
        <div>
          <h2 style={{ margin: 0 }}>Quick Math</h2>
          <p style={{ margin: "4px 0 0", opacity: 0.7 }}>
            Solve as many as you can in 30 seconds
          </p>
        </div>
        <div className="flexRow gap_12">
          <div
            className="stats-card"
            style={{
              padding: "8px 16px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
          <div className="stats-card" style={{ padding: "8px 16px" }}>
            <span>Score: {score}</span>
          </div>
          <button
            onClick={resetGame}
            className="btn secondary-btn"
            style={{ padding: "8px 16px" }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Game Area */}
      {gameActive && question && (
        <div
          className="flexClm gap_24"
          style={{ alignItems: "center", padding: "20px 0" }}
        >
          {/* Streak Indicator */}
          {streak > 1 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flexRow gap_4"
              style={{
                background: "var(--primary-10)",
                padding: "4px 12px",
                borderRadius: "20px",
              }}
            >
              <Zap size={14} className="primary" />
              <span style={{ fontSize: "12px" }}>{streak}x Streak!</span>
            </motion.div>
          )}

          {/* Question */}
          <motion.div
            key={question.answer}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              fontSize: "64px",
              fontWeight: 700,
              textAlign: "center",
              margin: "20px 0",
            }}
          >
            <span>{question.a}</span>
            <span style={{ margin: "0 20px", color: "var(--primary)" }}>
              {question.op}
            </span>
            <span>{question.b}</span>
            <span style={{ margin: "0 20px" }}>=</span>
            <span>?</span>
          </motion.div>

          {/* Input Form */}
          <form
            onSubmit={handleSubmit}
            style={{ width: "100%", maxWidth: "300px" }}
          >
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Enter answer"
              autoFocus
              style={{
                width: "100%",
                padding: "16px",
                fontSize: "20px",
                textAlign: "center",
                borderRadius: "12px",
                border: "2px solid var(--border-color)",
                background: "var(--card-bg)",
                marginBottom: "12px",
              }}
            />
            <button
              type="submit"
              className="primary-btn width100"
              disabled={!userAnswer}
              style={{ padding: "16px" }}
            >
              Submit
            </button>
          </form>
        </div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: feedback.correct
                ? "var(--success-10)"
                : "var(--error-10)",
              color: feedback.correct ? "var(--success)" : "var(--error)",
              textAlign: "center",
            }}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Complete */}
      <AnimatePresence>
        {gameComplete && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              textAlign: "center",
              padding: "30px",
              background: "var(--success-10)",
              borderRadius: "16px",
            }}
          >
            <Trophy size={48} className="success" />
            <h2 style={{ margin: "16px 0 8px" }}>Time's Up!</h2>
            <p style={{ fontSize: "18px", marginBottom: "8px" }}>
              You answered {questionsAnswered} questions
            </p>
            <p style={{ fontSize: "24px", fontWeight: 700 }}>
              Final Score: {score}
            </p>
            <button
              onClick={resetGame}
              className="primary-btn"
              style={{ marginTop: "20px", padding: "12px 32px" }}
            >
              Play Again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      {gameActive && (
        <div
          className="flexRow gap_16"
          style={{ justifyContent: "center", marginTop: "16px" }}
        >
          <div style={{ fontSize: "14px", opacity: 0.7 }}>
            Questions: {questionsAnswered}
          </div>
          <div style={{ fontSize: "14px", opacity: 0.7 }}>Streak: {streak}</div>
        </div>
      )}
    </div>
  );
};

export default QuickMath;
