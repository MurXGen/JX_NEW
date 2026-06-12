import React, { useMemo, useRef, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity, Award, BarChart3, CalendarDays, Flame, Info, LineChart, PieChart, Target, TrendingUp } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { H1, Muted, Badge, Grad, GlassBackdrop } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { MotionView } from "../components/motion";
import { useTip } from "../components/Tooltip";
import Accordion from "../components/Accordion";
import OnboardingModal from "../components/OnboardingModal";
import BrainGym from "../components/BrainGym";
import { EquityChart, EquityCandles, DowBars, DailyBars, SymbolBars, Progress, AnimatedProgress, Donut } from "../components/charts";
import { CustomizeButton, useHiddenSections } from "../components/customize";
import { computeStats, filterByRange, RANGES } from "../lib/analytics";
import { buildAchievements } from "../lib/achievements";
import { money, currencySymbol, fmt } from "../lib/format";
import { font } from "../theme/typography";

let ConfettiCannon = null;
try { ConfettiCannon = require("react-native-confetti-cannon").default; } catch {}

const { width: SCREEN_W } = Dimensions.get("window");

const SECTIONS = [
  { id: "kpis", label: "Key metrics" },
  { id: "equity", label: "Equity curve" },
  { id: "daily", label: "Daily P&L" },
  { id: "dow", label: "Day-of-week P&L" },
  { id: "symbols", label: "By symbol" },
  { id: "sessions", label: "Session performance" },
  { id: "edge", label: "Your edge" },
  { id: "achievements", label: "Achievements" },
  { id: "games", label: "Brain Gym" },
  { id: "recent", label: "Recent trades" },
];

const TIP = {
  net: "Total profit or loss across all your closed trades.",
  winRate: "Share of closed trades that ended in profit.",
  pf: "Gross profit ÷ gross loss. Above 1 means profitable.",
  closed: "Number of trades that have a close time.",
  equity: "Your account balance over time as each trade closes.",
  dow: "Which weekday you make or lose money.",
  symbols: "Net profit/loss per instrument you trade.",
  sessions: "P&L grouped by trading session (by open time, UTC).",
  expectancy: "Average profit you can expect per trade.",
  discipline: "Share of trades where you followed your plan.",
  maxdd: "Largest peak-to-valley drop in your equity.",
  alloc: "How your trades are split across instruments.",
};

export default function OverviewScreen() {
  const { theme } = useTheme();
  const t = theme;
  const { userData, subscription, trades, currentAccount, refresh, justRegistered, clearJustRegistered } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const firedConfetti = useRef(false);
  const tip = useTip();
  const { hidden, toggle, reset, isVisible } = useHiddenSections("jx-overview-hidden");

  const info = (msg, e) => tip.show(msg, e);
  const finishGuide = () => clearJustRegistered();

  const [heroRange, setHeroRange] = useState("1M");
  const [eqRange, setEqRange] = useState("ALL");
  const sym = currencySymbol(currentAccount?.currency);
  const s = useMemo(() => computeStats(trades), [trades]); // all-time for sections
  const heroStats = useMemo(() => computeStats(filterByRange(trades, heroRange)), [trades, heroRange]);
  const eqStats = useMemo(() => computeStats(filterByRange(trades, eqRange)), [trades, eqRange]);
  const name = userData?.name?.split(" ")[0] || "trader";
  const pf = s.profitFactor === Infinity ? "∞" : fmt(s.profitFactor, 2);
  const inProfit = s.net > 0;
  const heroNet = heroStats.net;
  const heroProfit = heroNet > 0;

  const recent = useMemo(
    () => [...trades].sort((a, b) => new Date(b.closeTime || b.openTime || 0) - new Date(a.closeTime || a.openTime || 0)).slice(0, 5),
    [trades],
  );

  const achievements = useMemo(() => buildAchievements(s), [s]);
  const unlocked = achievements.filter((a) => a.got).length;

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <OnboardingModal visible={justRegistered} onDone={finishGuide} />

      <ScrollView
        contentContainerStyle={{ padding: t.space[5], gap: t.space[4], paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.text.muted} />}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: t.space[3] }}>
          <View style={{ flex: 1 }}>
            <H1>Welcome back, {name}</H1>
            <Muted>Here&apos;s your trading performance.</Muted>
          </View>
          <CustomizeButton sections={SECTIONS} hidden={hidden} onToggle={toggle} onReset={reset} />
        </View>

        {/* ===== Total profit hero — glass card with tone-matched glow ===== */}
        <MotionView delay={40}>
          <View style={{ borderRadius: t.radius.xl, padding: t.space[5], overflow: "hidden", borderWidth: 1, borderColor: heroProfit ? t.success : t.glass.border }}>
            <GlassBackdrop />
            <Grad
              colors={heroProfit ? t.gradients.statSuccess : heroNet < 0 ? t.gradients.statDanger : t.gradients.sheen}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              pointerEvents="none"
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <Text style={{ color: t.text.muted, fontSize: t.font.small, fontFamily: font(500) }}>Total profit</Text>
              <InfoTip t={t} onPress={(e) => info(TIP.net, e)} />
              {subscription.isPro && <View style={{ marginLeft: "auto" }}><Badge tone="brand">PRO{subscription.daysLeft != null ? ` · ${subscription.daysLeft}d` : ""}</Badge></View>}
            </View>
            <Text style={{ color: heroProfit ? t.successStrong : heroNet < 0 ? t.dangerStrong : t.text.primary, fontSize: 38, fontFamily: font(800), letterSpacing: -1 }}>
              {money(heroNet, sym)}
            </Text>
            <View style={{ height: 120, marginTop: 8, marginBottom: t.space[3] }}>
              <EquityChart data={heroStats.equity} height={120} sym={sym} onTap={info} />
            </View>
            <TimeframeTabs t={t} value={heroRange} onChange={setHeroRange} />
          </View>
        </MotionView>

        {/* ===== KPIs ===== */}
        {isVisible("kpis") && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[3] }}>
            <KpiTile t={t} i={0} label="Win rate" tip={TIP.winRate} value={`${s.winRate}%`} color={t.yellow[400]} onInfo={info} />
            <KpiTile t={t} i={1} label="Profit factor" tip={TIP.pf} value={pf} color={s.profitFactor >= 1 ? t.successStrong : t.dangerStrong} onInfo={info} />
            <KpiTile t={t} i={2} label="Closed trades" tip={TIP.closed} value={s.n} onInfo={info} />
            <KpiTile t={t} i={3} label="Expectancy" tip={TIP.expectancy} value={money(s.expectancy, sym)} onInfo={info} />
          </View>
        )}

        {/* ===== Equity curve (candles) — own timeframe tabs ===== */}
        {isVisible("equity") && (
          <Accordion title="Equity curve" icon={LineChart} right={<InfoTip t={t} onPress={(e) => info(TIP.equity, e)} />}>
            <View style={{ marginBottom: t.space[3] }}><TimeframeTabs t={t} value={eqRange} onChange={setEqRange} /></View>
            <EquityCandles equity={eqStats.equity} height={200} sym={sym} onTap={info} />
            <Muted style={{ fontSize: t.font.caption, marginTop: 6 }}>Tap a candle for its equity.</Muted>
          </Accordion>
        )}

        {/* ===== Daily P&L (recent days) ===== */}
        {isVisible("daily") && s.dailyPnl.length > 0 && (
          <Accordion title="Daily P&L" icon={BarChart3} right={<InfoTip t={t} onPress={() => info("Net profit or loss for each recent trading day.")} />}>
            <DailyBars data={s.dailyPnl} sym={sym} onBar={info} />
            <Muted style={{ fontSize: t.font.caption, marginTop: 8 }}>Last {s.dailyPnl.length} active day{s.dailyPnl.length === 1 ? "" : "s"} · tap a bar for detail.</Muted>
          </Accordion>
        )}

        {/* ===== Day of week ===== */}
        {isVisible("dow") && s.dowHasData && (
          <Accordion title="Day-of-week P&L" icon={BarChart3} right={<InfoTip t={t} onPress={() => info(TIP.dow)} />}>
            <DowBars data={s.dow} sym={sym} onBar={info} />
          </Accordion>
        )}

        {/* ===== By symbol (bars + donut) ===== */}
        {isVisible("symbols") && s.symbolPnl.length > 0 && (
          <Accordion title="By symbol" icon={PieChart} right={<InfoTip t={t} onPress={() => info(TIP.symbols)} />}>
            <SymbolBars data={s.symbolPnl} symMax={s.symMax} sym={sym} onBar={info} />
            {s.allocation.length > 1 && (
              <View style={{ marginTop: t.space[5] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: t.space[3] }}>
                  <Text style={{ color: t.text.secondary, fontFamily: font(600), fontSize: t.font.small }}>Allocation</Text>
                  <InfoTip t={t} onPress={() => info(TIP.alloc)} />
                </View>
                <Donut segments={s.allocation} onSlice={(seg, _c, total) => info(`${seg.label}: ${seg.value} trade${seg.value === 1 ? "" : "s"} · ${fmt((seg.value / total) * 100, 0)}%`)} />
              </View>
            )}
          </Accordion>
        )}

        {/* ===== Sessions ===== */}
        {isVisible("sessions") && s.sessionsHaveData && (
          <Accordion title="Session performance" icon={Activity} right={<InfoTip t={t} onPress={() => info(TIP.sessions)} />}>
            <View style={{ gap: 10 }}>
              {s.sessions.filter((x) => x.n > 0).map((x) => (
                <Pressable key={x.id} onPress={() => info(`${x.label}: ${money(x.pnl, sym)} over ${x.n} trade${x.n === 1 ? "" : "s"}`)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: t.text.secondary, fontSize: t.font.body }}>{x.label} <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>· {x.n}</Text></Text>
                  <Text style={{ color: x.pnl >= 0 ? t.successStrong : t.dangerStrong, fontFamily: font(700) }}>{money(x.pnl, sym)}</Text>
                </Pressable>
              ))}
              {s.bestSession && <Muted style={{ fontSize: t.font.caption, marginTop: 2 }}>Best window: {s.bestSession.label}</Muted>}
            </View>
          </Accordion>
        )}

        {/* ===== Edge — animated progress bars ===== */}
        {isVisible("edge") && (
          <Accordion title="Your edge" icon={Flame} right={<InfoTip t={t} onPress={(e) => info(TIP.discipline, e)} />}>
            <View style={{ gap: t.space[4] }}>
              <BarRow t={t} label="Win rate" pct={s.winRate} value={`${s.winRate}%`} color={t.yellow[500]} onInfo={(e) => info(TIP.winRate, e)} delay={60} />
              <BarRow t={t} label="Plan followed" pct={s.disciplinePct} value={`${s.disciplinePct}%`} color={t.success} onInfo={(e) => info(TIP.discipline, e)} delay={140} />
              <BarRow t={t} label="Profit factor" pct={Math.min(100, (s.profitFactor === Infinity ? 3 : s.profitFactor) / 3 * 100)} value={pf} color={s.profitFactor >= 1 ? t.success : t.danger} onInfo={(e) => info(TIP.pf, e)} delay={220} />
            </View>
            <View style={{ height: 1, backgroundColor: t.border, marginVertical: t.space[4] }} />
            <View style={{ gap: 12 }}>
              <EdgeRow t={t} label="Expectancy / trade" tip={TIP.expectancy} value={money(s.expectancy, sym)} onInfo={info} />
              <EdgeRow t={t} label="Avg win" value={money(s.avgWin, sym)} />
              <EdgeRow t={t} label="Avg loss" value={money(-s.avgLoss, sym)} />
              <EdgeRow t={t} label="Max drawdown" tip={TIP.maxdd} value={money(-s.maxDD, sym)} onInfo={info} />
              <EdgeRow t={t} label="Current win streak" value={`${s.streak}`} />
              <EdgeRow t={t} label="Biggest win" value={money(s.biggestWin, sym)} />
            </View>
          </Accordion>
        )}

        {/* ===== Achievements + momentum ===== */}
        {isVisible("achievements") && (
          <Accordion title="Achievements" icon={Award} right={<Badge tone="brand">{unlocked}/{achievements.length}</Badge>}>
            {/* momentum stats */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[2], marginBottom: t.space[4] }}>
              <Momentum t={t} label="Win streak" value={`${s.streak}`} sub={`best ${s.bestStreak}`} />
              <Momentum t={t} label="Green days" value={`${s.greenStreak}`} sub={`best ${s.bestGreenStreak}`} />
              <Momentum t={t} label="Biggest win" value={money(s.biggestWin, sym)} />
            </View>
            {/* overall unlock progress */}
            <View style={{ gap: 6, marginBottom: t.space[4] }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Unlocked</Text>
                <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.caption }}>{unlocked} of {achievements.length}</Text>
              </View>
              <AnimatedProgress pct={(unlocked / achievements.length) * 100} color={t.primary} height={8} />
            </View>
            {/* badge grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[2] }}>
              {achievements.map((b) => (
                <Pressable key={b.id} onPress={(e) => info(`${b.label} — ${b.hint}${b.got ? " ✓" : ""}`, e)}
                  style={{ flexBasis: "30%", flexGrow: 1, alignItems: "center", gap: 5, paddingVertical: t.space[3], borderRadius: t.radius.md, borderWidth: 1, borderColor: b.got ? t.accent.border : t.border, backgroundColor: b.got ? t.accent.subtle : t.bg.muted, opacity: b.got ? 1 : 0.55 }}>
                  <Text style={{ fontSize: 24 }}>{b.icon}</Text>
                  <Text numberOfLines={1} style={{ color: b.got ? t.text.primary : t.text.muted, fontFamily: font(600), fontSize: 10, textAlign: "center" }}>{b.label}</Text>
                </Pressable>
              ))}
            </View>
          </Accordion>
        )}

        {/* ===== Brain Gym (games) ===== */}
        {isVisible("games") && <BrainGym />}

        {/* ===== Recent ===== */}
        {isVisible("recent") && recent.length > 0 && (
          <Accordion title="Recent trades" icon={TrendingUp}>
            <View style={{ gap: 12 }}>
              {recent.map((tr, i) => {
                const p = Number(tr.pnl) || 0;
                return (
                  <View key={tr._id || i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.body }}>{tr.symbol || tr.ticker || "—"}</Text>
                    <Text style={{ color: p >= 0 ? t.successStrong : t.dangerStrong, fontFamily: font(700) }}>{money(p, sym)}</Text>
                  </View>
                );
              })}
            </View>
          </Accordion>
        )}
      </ScrollView>

      {/* confetti when in profit (fires once) */}
      {inProfit && ConfettiCannon && !firedConfetti.current && (() => { firedConfetti.current = true; return (
        <ConfettiCannon count={120} origin={{ x: SCREEN_W / 2, y: -10 }} fadeOut autoStart explosionSpeed={350} fallSpeed={2800} />
      ); })()}
    </SafeAreaView>
    </GradientBackground>
  );
}

/* ---- small components ---- */
function TimeframeTabs({ t, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.glass.input, borderWidth: 1, borderColor: t.glass.border, borderRadius: t.radius.pill, padding: 3 }}>
      {RANGES.map((r) => {
        const active = r === value;
        return (
          <Pressable key={r} onPress={() => onChange(r)} style={{ flex: 1, paddingVertical: 8, borderRadius: t.radius.pill, overflow: "hidden", alignItems: "center" }}>
            {active && <Grad colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
            <Text style={{ color: active ? t.primaryText : t.text.muted, fontFamily: font(active ? 700 : 500), fontSize: t.font.small }}>{r}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function InfoTip({ t, onPress }) {
  return <Pressable onPress={onPress} hitSlop={8}><Info size={13} color={t.text.muted} /></Pressable>;
}
function KpiTile({ t, i, label, value, color, tip, onInfo }) {
  // alternate soft gradient washes built from the brand palette
  const washes = [t.gradients.statBrand, t.gradients.statSuccess, t.gradients.sheen, t.gradients.statBrand];
  return (
    <MotionView delay={i * 60} style={{ flexGrow: 1, flexBasis: "47%" }}>
      <View style={{ borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.xl, padding: t.space[4], overflow: "hidden" }}>
        <GlassBackdrop />
        <Grad colors={washes[i % washes.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 }}>
          <Text style={{ color: t.text.muted, fontSize: t.font.caption, fontFamily: font(600), letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
          {tip ? <InfoTip t={t} onPress={() => onInfo(tip)} /> : null}
        </View>
        <Text style={{ color: color || t.text.primary, fontSize: t.font.h2, fontFamily: font(700) }}>{value}</Text>
      </View>
    </MotionView>
  );
}
function BarRow({ t, label, pct, value, color, onInfo, delay }) {
  return (
    <Pressable onPress={onInfo}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
        <Text style={{ color: t.text.secondary, fontSize: t.font.small, fontFamily: font(500) }}>{label}</Text>
        <Text style={{ color: t.text.primary, fontSize: t.font.small, fontFamily: font(700) }}>{value}</Text>
      </View>
      <AnimatedProgress pct={pct} color={color} delay={delay} />
    </Pressable>
  );
}
function Momentum({ t, label, value, sub }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "30%", borderRadius: t.radius.md, borderWidth: 1, borderColor: t.glass.border, paddingVertical: 10, paddingHorizontal: 12, overflow: "hidden" }}>
      <Grad colors={t.gradients.statBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Text style={{ color: t.text.muted, fontSize: t.font.caption, marginBottom: 3 }}>{label}</Text>
      <Text numberOfLines={1} style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>{value}</Text>
      {!!sub && <Text style={{ color: t.text.muted, fontSize: 10, marginTop: 1 }}>{sub}</Text>}
    </View>
  );
}
function EdgeRow({ t, label, value, tip, onInfo }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Text style={{ color: t.text.secondary, fontSize: t.font.body }}>{label}</Text>
        {tip ? <InfoTip t={t} onPress={() => onInfo(tip)} /> : null}
      </View>
      <Text style={{ color: t.text.primary, fontSize: t.font.body, fontFamily: font(700) }}>{value}</Text>
    </View>
  );
}
