/* Brain Gym — two quick training games on the dashboard.
   • Reflex Trainer: tap targets the instant they appear; faster = more points.
   • Quick Calc: solve mental-math problems against the clock.
   Scores are GAME-ONLY (a fun reflex/brain score) and are NOT trading XP. */
import React, { useEffect, useRef, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brain, Calculator, Trophy, X, Zap } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";
import { getGameScores, recordGameScore } from "../lib/gameScores";

const rand = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const shuffle = (a) => [...a].sort(() => Math.random() - 0.5);

/* ============================ Reflex Trainer ============================ */
const REFLEX_SECONDS = 30;

function ReflexGame({ t, onFinish }) {
  const [phase, setPhase] = useState("intro"); // intro | playing | done
  const [timeLeft, setTimeLeft] = useState(REFLEX_SECONDS);
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [shown, setShown] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [result, setResult] = useState(null);

  const area = useRef({ w: 300, h: 340 });
  const appearAt = useRef(0);
  const scoreRef = useRef(0);
  const hitsRef = useRef(0);
  const reactsRef = useRef([]);
  const timers = useRef([]);
  const tickRef = useRef(null);

  const clearAll = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    if (tickRef.current) clearInterval(tickRef.current);
  };
  useEffect(() => () => clearAll(), []);

  const scheduleTarget = () => {
    const id = setTimeout(() => {
      const { w, h } = area.current;
      setPos({ top: rand(0, Math.max(0, h - 76)), left: rand(0, Math.max(0, w - 76)) });
      appearAt.current = Date.now();
      setShown(true);
    }, rand(550, 1700));
    timers.current.push(id);
  };

  const start = () => {
    scoreRef.current = 0; hitsRef.current = 0; reactsRef.current = [];
    setScore(0); setHits(0); setResult(null); setShown(false);
    setPhase("playing");
    let left = REFLEX_SECONDS; setTimeLeft(left);
    tickRef.current = setInterval(() => {
      left -= 1; setTimeLeft(left);
      if (left <= 0) finish();
    }, 1000);
    scheduleTarget();
  };

  const finish = () => {
    clearAll(); setShown(false);
    const reacts = reactsRef.current;
    const avg = reacts.length ? Math.round(reacts.reduce((a, b) => a + b, 0) / reacts.length) : 0;
    const bestR = reacts.length ? Math.min(...reacts) : 0;
    const rec = recordGameScore("reflex", scoreRef.current);
    setResult({ score: scoreRef.current, avg, bestR, hits: hitsRef.current, ...rec });
    setPhase("done");
    onFinish?.();
  };

  const onHitTarget = () => {
    if (!shown) return;
    const rt = Date.now() - appearAt.current;
    reactsRef.current.push(rt);
    const pts = Math.max(5, Math.round(100 - (rt - 150) / 8));
    scoreRef.current += pts; setScore(scoreRef.current);
    hitsRef.current += 1; setHits(hitsRef.current);
    setShown(false);
    scheduleTarget();
  };

  const onMissTap = () => {
    if (shown || phase !== "playing") return;
    scoreRef.current = Math.max(0, scoreRef.current - 8); setScore(scoreRef.current);
  };

  if (phase === "intro") {
    return (
      <Intro t={t} icon={Zap} accent="#f0b90b" title="Reflex Trainer"
        lines={["A dot appears at a random spot — tap it as fast as you can.", "Faster taps score more. You have 30 seconds.", "Don't tap early — it costs points."]}
        onStart={start} />
    );
  }
  if (phase === "done") {
    return <Result t={t} title="Reflex Trainer" result={result} extra={[`${result.hits} hits`, result.bestR ? `best ${result.bestR}ms` : null, result.avg ? `avg ${result.avg}ms` : null]} onAgain={start} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <PlayHud t={t} score={score} timeLeft={timeLeft} total={REFLEX_SECONDS} right={`${hits} hits`} />
      <Pressable
        onPress={onMissTap}
        onLayout={(e) => { area.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
        style={{ flex: 1, margin: t.space[4], borderRadius: t.radius.lg, backgroundColor: t.bg.muted, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}
      >
        {shown ? (
          <Pressable onPress={onHitTarget} style={{ position: "absolute", top: pos.top, left: pos.left, width: 64, height: 64, borderRadius: 32, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", shadowColor: t.primary, shadowOpacity: 0.5, shadowRadius: 12, elevation: 6 }}>
            <Zap size={26} color={t.primaryText} fill={t.primaryText} />
          </Pressable>
        ) : (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.text.muted, fontFamily: font(500), fontSize: t.font.body }}>Wait for it…</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

/* ============================== Quick Calc ============================== */
const CALC_SECONDS = 40;

function genProblem(level) {
  const ops = level < 2 ? ["+", "-"] : ["+", "-", "×"];
  const op = ops[rand(0, ops.length - 1)];
  let a, b;
  if (op === "×") { a = rand(2, 9 + level); b = rand(2, 9 + level); }
  else {
    a = rand(5, 30 + level * 12); b = rand(2, 20 + level * 10);
    if (op === "-" && b > a) { const tmp = a; a = b; b = tmp; }
  }
  const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
  const opts = new Set([ans]);
  let guard = 0;
  while (opts.size < 4 && guard++ < 40) {
    const delta = (Math.random() < 0.5 ? 1 : -1) * rand(1, op === "×" ? 12 : 9);
    const d = ans + delta;
    if (d >= 0) opts.add(d);
  }
  while (opts.size < 4) opts.add(ans + opts.size);
  return { a, b, op, ans, options: shuffle([...opts]) };
}

function QuickCalcGame({ t, onFinish }) {
  const [phase, setPhase] = useState("intro");
  const [timeLeft, setTimeLeft] = useState(CALC_SECONDS);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [prob, setProb] = useState(null);
  const [picked, setPicked] = useState(null); // {value, ok}
  const [result, setResult] = useState(null);

  const scoreRef = useRef(0);
  const streakRef = useRef(0);
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const lockRef = useRef(false);
  const tickRef = useRef(null);
  const timers = useRef([]);

  const clearAll = () => { if (tickRef.current) clearInterval(tickRef.current); timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => () => clearAll(), []);

  const next = () => {
    setPicked(null); lockRef.current = false;
    setProb(genProblem(Math.floor(correctRef.current / 4)));
  };

  const start = () => {
    scoreRef.current = 0; streakRef.current = 0; correctRef.current = 0; wrongRef.current = 0;
    setScore(0); setStreak(0); setCorrect(0); setWrong(0); setResult(null);
    setPhase("playing"); next();
    let left = CALC_SECONDS; setTimeLeft(left);
    tickRef.current = setInterval(() => { left -= 1; setTimeLeft(left); if (left <= 0) finish(); }, 1000);
  };

  const finish = () => {
    clearAll();
    const rec = recordGameScore("calc", scoreRef.current);
    setResult({ score: scoreRef.current, correct: correctRef.current, wrong: wrongRef.current, ...rec });
    setPhase("done");
    onFinish?.();
  };

  const choose = (value) => {
    if (lockRef.current || !prob) return;
    lockRef.current = true;
    const ok = value === prob.ans;
    setPicked({ value, ok });
    if (ok) {
      streakRef.current += 1; correctRef.current += 1;
      const pts = 10 + Math.min(20, streakRef.current * 2);
      scoreRef.current += pts;
      setScore(scoreRef.current); setStreak(streakRef.current); setCorrect(correctRef.current);
    } else {
      streakRef.current = 0; wrongRef.current += 1;
      setStreak(0); setWrong(wrongRef.current);
    }
    const id = setTimeout(next, 280);
    timers.current.push(id);
  };

  if (phase === "intro") {
    return (
      <Intro t={t} icon={Calculator} accent="#34d399" title="Quick Calc"
        lines={["Solve as many problems as you can in 40 seconds.", "Pick the correct answer — speed builds a streak.", "Streaks multiply your points. Wrong answers reset it."]}
        onStart={start} />
    );
  }
  if (phase === "done") {
    return <Result t={t} title="Quick Calc" result={result} extra={[`${result.correct} correct`, `${result.wrong} wrong`]} onAgain={start} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <PlayHud t={t} score={score} timeLeft={timeLeft} total={CALC_SECONDS} right={streak >= 2 ? `🔥 ${streak} streak` : ""} />
      <View style={{ flex: 1, padding: t.space[5], justifyContent: "center" }}>
        <View style={{ alignItems: "center", marginBottom: t.space[7] }}>
          <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: 52, letterSpacing: -1 }}>
            {prob ? `${prob.a} ${prob.op} ${prob.b}` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[3], justifyContent: "center" }}>
          {prob?.options.map((o) => {
            let bg = t.bg.surface, bd = t.border, fg = t.text.primary;
            if (picked) {
              if (o === prob.ans) { bg = t.successSubtle; bd = t.success; fg = t.successStrong; }
              else if (o === picked.value) { bg = t.dangerSubtle; bd = t.danger; fg = t.dangerStrong; }
            }
            return (
              <Pressable key={o} onPress={() => choose(o)} style={{ flexBasis: "45%", flexGrow: 1, alignItems: "center", paddingVertical: 22, borderRadius: t.radius.lg, backgroundColor: bg, borderWidth: 1.5, borderColor: bd }}>
                <Text style={{ color: fg, fontFamily: font(700), fontSize: t.font.h2 }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

/* ============================ shared bits ============================ */
function PlayHud({ t, score, timeLeft, total, right }) {
  const pct = Math.max(0, Math.min(1, timeLeft / total));
  return (
    <View style={{ paddingHorizontal: t.space[5], paddingTop: t.space[3], gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: t.font.h2 }}>{score}<Text style={{ color: t.text.muted, fontFamily: font(500), fontSize: t.font.small }}>  pts</Text></Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {!!right && <Text style={{ color: t.text.secondary, fontFamily: font(600), fontSize: t.font.small }}>{right}</Text>}
          <Text style={{ color: timeLeft <= 5 ? t.dangerStrong : t.text.secondary, fontFamily: font(700), fontSize: t.font.bodyMd }}>{timeLeft}s</Text>
        </View>
      </View>
      <View style={{ height: 6, borderRadius: 6, backgroundColor: t.bg.muted, overflow: "hidden" }}>
        <View style={{ width: `${pct * 100}%`, height: "100%", backgroundColor: timeLeft <= 5 ? t.danger : t.primary }} />
      </View>
    </View>
  );
}

function Intro({ t, icon: Icon, accent, title, lines, onStart }) {
  return (
    <View style={{ flex: 1, padding: t.space[6], justifyContent: "center", gap: t.space[5] }}>
      <View style={{ alignItems: "center", gap: t.space[3] }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: t.primarySubtle, alignItems: "center", justifyContent: "center" }}>
          <Icon size={34} color={accent} />
        </View>
        <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: t.font.h2 }}>{title}</Text>
      </View>
      <View style={{ gap: t.space[3] }}>
        {lines.map((l, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10 }}>
            <Text style={{ color: accent, fontFamily: font(800) }}>{i + 1}</Text>
            <Text style={{ flex: 1, color: t.text.secondary, fontFamily: font(500), fontSize: t.font.body, lineHeight: 21 }}>{l}</Text>
          </View>
        ))}
      </View>
      <Pressable onPress={onStart} style={{ backgroundColor: t.primary, borderRadius: t.radius.md, paddingVertical: 16, alignItems: "center" }}>
        <Text style={{ color: t.primaryText, fontFamily: font(700), fontSize: t.font.bodyMd }}>Start</Text>
      </Pressable>
      <Text style={{ color: t.text.muted, fontSize: t.font.caption, textAlign: "center" }}>Game score only — this does not affect your trading XP.</Text>
    </View>
  );
}

function Result({ t, title, result, extra = [], onAgain }) {
  return (
    <View style={{ flex: 1, padding: t.space[6], justifyContent: "center", alignItems: "center", gap: t.space[4] }}>
      {result?.isBest && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.primarySubtle, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
          <Trophy size={14} color={t.accent.text} />
          <Text style={{ color: t.accent.text, fontFamily: font(700), fontSize: t.font.small }}>New best!</Text>
        </View>
      )}
      <Text style={{ color: t.text.muted, fontFamily: font(600), fontSize: t.font.small, letterSpacing: 0.5, textTransform: "uppercase" }}>{title}</Text>
      <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: 60, letterSpacing: -2 }}>{result?.score ?? 0}</Text>
      <Text style={{ color: t.text.muted, fontSize: t.font.small, marginTop: -8 }}>points</Text>
      <View style={{ flexDirection: "row", gap: t.space[4], flexWrap: "wrap", justifyContent: "center" }}>
        {extra.filter(Boolean).map((x, i) => (
          <Text key={i} style={{ color: t.text.secondary, fontFamily: font(600), fontSize: t.font.small }}>{x}</Text>
        ))}
      </View>
      <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Best: {result?.best ?? 0} · {result?.plays ?? 0} plays</Text>
      <Pressable onPress={onAgain} style={{ backgroundColor: t.primary, borderRadius: t.radius.md, paddingVertical: 14, paddingHorizontal: 48, marginTop: t.space[2] }}>
        <Text style={{ color: t.primaryText, fontFamily: font(700), fontSize: t.font.bodyMd }}>Play again</Text>
      </Pressable>
    </View>
  );
}

/* =========================== dashboard section =========================== */
export default function BrainGym() {
  const { theme: t } = useTheme();
  const [open, setOpen] = useState(null); // "reflex" | "calc" | null
  const [scores, setScores] = useState(() => getGameScores());
  const refreshScores = () => setScores(getGameScores());

  const cards = [
    { id: "reflex", title: "Reflex Trainer", desc: "Tap the target the instant it appears.", icon: Zap, accent: "#f0b90b" },
    { id: "calc", title: "Quick Calc", desc: "Mental math against the clock.", icon: Calculator, accent: "#34d399" },
  ];

  return (
    <View style={{ gap: t.space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Brain size={18} color={t.text.primary} />
        <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>Brain Gym</Text>
        <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>· game score, not XP</Text>
      </View>

      <View style={{ flexDirection: "row", gap: t.space[3] }}>
        {cards.map((c) => {
          const best = scores[c.id]?.best || 0;
          return (
            <Pressable key={c.id} onPress={() => setOpen(c.id)} style={{ flex: 1, backgroundColor: t.bg.surface, borderColor: t.border, borderWidth: 1, borderRadius: t.radius.lg, padding: t.space[4], gap: 10 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.primarySubtle, alignItems: "center", justifyContent: "center" }}>
                <c.icon size={20} color={c.accent} />
              </View>
              <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>{c.title}</Text>
              <Text style={{ color: t.text.muted, fontSize: t.font.caption, lineHeight: 16 }}>{c.desc}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                <Text style={{ color: t.text.secondary, fontFamily: font(600), fontSize: t.font.caption }}>Best {best}</Text>
                <View style={{ backgroundColor: t.primary, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
                  <Text style={{ color: t.primaryText, fontFamily: font(700), fontSize: t.font.caption }}>Play</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* full-screen game modal */}
      <Modal visible={!!open} animationType="slide" onRequestClose={() => setOpen(null)} presentationStyle="fullScreen">
        <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.canvas }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: t.space[5], paddingVertical: t.space[3], borderBottomColor: t.border, borderBottomWidth: 1 }}>
            <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.title }}>{open === "calc" ? "Quick Calc" : "Reflex Trainer"}</Text>
            <Pressable onPress={() => setOpen(null)} hitSlop={10}><X size={24} color={t.text.muted} /></Pressable>
          </View>
          {open === "reflex" && <ReflexGame t={t} onFinish={refreshScores} />}
          {open === "calc" && <QuickCalcGame t={t} onFinish={refreshScores} />}
        </SafeAreaView>
      </Modal>
    </View>
  );
}
