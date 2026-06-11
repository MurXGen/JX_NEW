import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Card, H1, Muted, Badge } from "../components/ui";
import { MotionView } from "../components/motion";
import { EquityChart, DowBars } from "../components/charts";
import { CustomizeButton, useHiddenSections } from "../components/customize";
import OnboardingModal from "../components/OnboardingModal";
import { computeStats } from "../lib/analytics";
import { money, currencySymbol, fmt } from "../lib/format";
import { font } from "../theme/typography";
import { getItem, setItem } from "../lib/storage";

const SECTIONS = [
  { id: "kpis", label: "Key metrics" },
  { id: "equity", label: "Equity curve" },
  { id: "dow", label: "Day-of-week P&L" },
  { id: "sessions", label: "Session performance" },
  { id: "edge", label: "Your edge" },
  { id: "recent", label: "Recent trades" },
];

function SectionTitle({ children, theme }) {
  return (
    <Text style={{ color: theme.text.primary, fontFamily: font(700), fontSize: theme.font.title, marginBottom: theme.space[3] }}>
      {children}
    </Text>
  );
}

function StatTile({ label, value, color, index, theme }) {
  return (
    <MotionView delay={index * 60} style={{ flexGrow: 1, flexBasis: "47%" }}>
      <Card style={{ padding: theme.space[4] }}>
        <Text style={{ color: theme.text.muted, fontSize: theme.font.caption, marginBottom: 6 }}>{label}</Text>
        <Text style={{ color: color || theme.text.primary, fontSize: theme.font.h2, fontFamily: font(700) }}>{value}</Text>
      </Card>
    </MotionView>
  );
}

function Row({ label, value, theme }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 }}>
      <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontSize: theme.font.body, fontFamily: font(700) }}>{value}</Text>
    </View>
  );
}

export default function OverviewScreen() {
  const { theme } = useTheme();
  const { userData, subscription, trades, currentAccount, refresh } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [showGuide, setShowGuide] = useState(() => !getItem("jx-onboarded"));
  const { hidden, toggle, reset, isVisible } = useHiddenSections("jx-overview-hidden");

  const finishGuide = () => { setItem("jx-onboarded", 1); setShowGuide(false); };

  const sym = currencySymbol(currentAccount?.currency);
  const s = useMemo(() => computeStats(trades), [trades]);
  const name = userData?.name?.split(" ")[0] || "trader";
  const pf = s.profitFactor === Infinity ? "∞" : fmt(s.profitFactor, 2);

  const recent = useMemo(
    () =>
      [...trades]
        .sort((a, b) => new Date(b.closeTime || b.openTime || 0) - new Date(a.closeTime || a.openTime || 0))
        .slice(0, 5),
    [trades],
  );

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }} edges={["top"]}>
      <OnboardingModal visible={showGuide} onDone={finishGuide} />
      <ScrollView
        contentContainerStyle={{ padding: theme.space[5], gap: theme.space[4] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text.muted} />}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: theme.space[3] }}>
          <View style={{ flex: 1 }}>
            <H1>Welcome back, {name}</H1>
            <Muted>Here&apos;s your trading performance.</Muted>
            {subscription.isPro && (
              <View style={{ marginTop: 6 }}>
                <Badge tone="brand">PRO{subscription.daysLeft != null ? ` · ${subscription.daysLeft}d` : ""}</Badge>
              </View>
            )}
          </View>
          <CustomizeButton sections={SECTIONS} hidden={hidden} onToggle={toggle} onReset={reset} />
        </View>

        {isVisible("kpis") && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[3] }}>
            <StatTile theme={theme} index={0} label="Net P&L" value={money(s.net, sym)} color={s.net >= 0 ? theme.successStrong : theme.dangerStrong} />
            <StatTile theme={theme} index={1} label="Win rate" value={`${s.winRate}%`} color={theme.yellow[400]} />
            <StatTile theme={theme} index={2} label="Profit factor" value={pf} color={s.profitFactor >= 1 ? theme.successStrong : theme.dangerStrong} />
            <StatTile theme={theme} index={3} label="Closed trades" value={s.n} />
          </View>
        )}

        {isVisible("equity") && (
          <Card>
            <SectionTitle theme={theme}>Equity curve</SectionTitle>
            <EquityChart data={s.equity} />
          </Card>
        )}

        {isVisible("dow") && s.dowHasData && (
          <Card>
            <SectionTitle theme={theme}>Day-of-week P&L</SectionTitle>
            <DowBars data={s.dow} sym={sym} />
          </Card>
        )}

        {isVisible("sessions") && s.sessionsHaveData && (
          <Card>
            <SectionTitle theme={theme}>Session performance</SectionTitle>
            <View style={{ gap: 10 }}>
              {s.sessions.filter((x) => x.n > 0).map((x) => (
                <View key={x.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>
                    {x.label} <Text style={{ color: theme.text.muted, fontSize: theme.font.caption }}>· {x.n}</Text>
                  </Text>
                  <Text style={{ color: x.pnl >= 0 ? theme.successStrong : theme.dangerStrong, fontFamily: font(700) }}>
                    {money(x.pnl, sym)}
                  </Text>
                </View>
              ))}
              {s.bestSession && (
                <Muted style={{ fontSize: theme.font.caption, marginTop: 2 }}>
                  Best window: {s.bestSession.label}
                </Muted>
              )}
            </View>
          </Card>
        )}

        {isVisible("edge") && (
          <Card>
            <SectionTitle theme={theme}>Your edge</SectionTitle>
            <View style={{ gap: 10 }}>
              <Row theme={theme} label="Expectancy / trade" value={money(s.expectancy, sym)} />
              <Row theme={theme} label="Avg win" value={money(s.avgWin, sym)} />
              <Row theme={theme} label="Avg loss" value={money(-s.avgLoss, sym)} />
              <Row theme={theme} label="Max drawdown" value={money(-s.maxDD, sym)} />
              <Row theme={theme} label="Current win streak" value={`${s.streak}`} />
              <Row theme={theme} label="Biggest win" value={money(s.biggestWin, sym)} />
            </View>
          </Card>
        )}

        {isVisible("recent") && recent.length > 0 && (
          <Card>
            <SectionTitle theme={theme}>Recent trades</SectionTitle>
            <View style={{ gap: 12 }}>
              {recent.map((t, i) => {
                const pnl = Number(t.pnl) || 0;
                return (
                  <View key={t._id || i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ color: theme.text.primary, fontFamily: font(600), fontSize: theme.font.body }}>
                      {t.symbol || t.ticker || "—"}
                    </Text>
                    <Text style={{ color: pnl >= 0 ? theme.successStrong : theme.dangerStrong, fontFamily: font(700) }}>
                      {money(pnl, sym)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
