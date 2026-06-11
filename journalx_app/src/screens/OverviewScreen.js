import React, { useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionView } from "../components/motion";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Card, H1, Muted, Badge } from "../components/ui";
import { EquityChart, DowBars } from "../components/charts";
import { computeStats } from "../lib/analytics";
import { money, currencySymbol, fmt } from "../lib/format";

function SectionTitle({ children }) {
  const { theme } = useTheme();
  return (
    <Text style={{ color: theme.text.primary, fontWeight: "700", fontSize: theme.font.title, marginBottom: theme.space[3] }}>
      {children}
    </Text>
  );
}

function StatTile({ label, value, color, index }) {
  const { theme } = useTheme();
  return (
    <MotionView delay={index * 60} style={{ flexGrow: 1, flexBasis: "47%" }}>
      <Card style={{ padding: theme.space[4] }}>
        <Text style={{ color: theme.text.muted, fontSize: theme.font.caption, marginBottom: 6 }}>{label}</Text>
        <Text style={{ color: color || theme.text.primary, fontSize: theme.font.h2, fontWeight: "700" }}>{value}</Text>
      </Card>
    </MotionView>
  );
}

export default function OverviewScreen() {
  const { theme } = useTheme();
  const { userData, subscription, trades, currentAccount, refresh } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const sym = currencySymbol(currentAccount?.currency);
  const s = useMemo(() => computeStats(trades), [trades]);
  const name = userData?.name?.split(" ")[0] || "trader";

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const pf = s.profitFactor === Infinity ? "∞" : fmt(s.profitFactor, 2);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={{ padding: theme.space[5], gap: theme.space[4] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text.muted} />}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
          <View style={{ flex: 1 }}>
            <H1>Welcome back, {name}</H1>
            <Muted>Here&apos;s your trading performance.</Muted>
          </View>
          {subscription.isPro && (
            <Badge tone="brand">
              PRO{subscription.daysLeft != null ? ` · ${subscription.daysLeft}d` : ""}
            </Badge>
          )}
        </View>

        {/* KPI tiles */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.space[3] }}>
          <StatTile index={0} label="Net P&L" value={money(s.net, sym)} color={s.net >= 0 ? theme.successStrong : theme.dangerStrong} />
          <StatTile index={1} label="Win rate" value={`${s.winRate}%`} color={theme.yellow[400]} />
          <StatTile index={2} label="Profit factor" value={pf} color={s.profitFactor >= 1 ? theme.successStrong : theme.dangerStrong} />
          <StatTile index={3} label="Closed trades" value={s.n} />
        </View>

        {/* Equity curve */}
        <Card>
          <SectionTitle>Equity curve</SectionTitle>
          <EquityChart data={s.equity} />
        </Card>

        {/* Day-of-week */}
        {s.dowHasData && (
          <Card>
            <SectionTitle>Day-of-week P&L</SectionTitle>
            <DowBars data={s.dow} sym={sym} />
          </Card>
        )}

        {/* Edge snapshot */}
        <Card>
          <SectionTitle>Your edge</SectionTitle>
          <View style={{ gap: 10 }}>
            <Row label="Expectancy / trade" value={money(s.expectancy, sym)} theme={theme} />
            <Row label="Avg win" value={money(s.avgWin, sym)} theme={theme} />
            <Row label="Avg loss" value={money(-s.avgLoss, sym)} theme={theme} />
            <Row label="Current win streak" value={`${s.streak}`} theme={theme} />
            <Row label="Biggest win" value={money(s.biggestWin, sym)} theme={theme} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, theme }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ color: theme.text.secondary, fontSize: theme.font.body }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontSize: theme.font.body, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}
