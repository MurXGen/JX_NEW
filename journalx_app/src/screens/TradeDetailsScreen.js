import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, TrendingDown, TrendingUp } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Card, H1, Badge, Muted } from "../components/ui";
import { money, currencySymbol } from "../lib/format";

function Row({ label, value }) {
  const { theme } = useTheme();
  if (value == null || value === "" || value === 0) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomColor: theme.border, borderBottomWidth: 1 }}>
      <Text style={{ color: theme.text.muted, fontSize: theme.font.body }}>{label}</Text>
      <Text style={{ color: theme.text.primary, fontSize: theme.font.body, fontWeight: "600" }}>{String(value)}</Text>
    </View>
  );
}

export default function TradeDetailsScreen({ route, navigation }) {
  const { theme } = useTheme();
  const { currentAccount } = useApp();
  const trade = route.params?.trade || {};
  const sym = currencySymbol(currentAccount?.currency);

  const pnl = Number(trade.pnl) || 0;
  const up = pnl >= 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const dt = (v) => (v ? new Date(v).toLocaleString() : null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: theme.space[5] }}>
        <H1>{trade.symbol || trade.ticker || "Trade"}</H1>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <X size={24} color={theme.text.muted} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.space[5], paddingTop: 0, gap: theme.space[4] }}>
        <Card style={{ alignItems: "center", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {up ? <TrendingUp size={22} color={theme.success} /> : <TrendingDown size={22} color={theme.danger} />}
            <Text style={{ color: up ? theme.successStrong : theme.dangerStrong, fontSize: theme.font.h1, fontWeight: "800" }}>
              {money(pnl, sym)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Badge tone={isLong ? "success" : "danger"}>{isLong ? "LONG" : "SHORT"}</Badge>
            <Badge tone="neutral">{trade.tradeStatus || "trade"}</Badge>
          </View>
        </Card>

        <Card>
          <Row label="Symbol" value={trade.symbol || trade.ticker} />
          <Row label="Direction" value={isLong ? "Long" : "Short"} />
          <Row label="Entry" value={trade.avgEntryPrice} />
          <Row label="Exit" value={trade.avgExitPrice} />
          <Row label="Stop loss" value={trade.avgSLPrice} />
          <Row label="Take profit" value={trade.avgTPPrice} />
          <Row label="Leverage" value={trade.leverage ? `${trade.leverage}x` : null} />
          <Row label="Strategy" value={trade.strategy} />
          <Row label="Emotion" value={trade.emotion} />
          <Row label="Timeframe" value={trade.timeframe} />
          <Row label="Opened" value={dt(trade.openTime)} />
          <Row label="Closed" value={dt(trade.closeTime)} />
        </Card>

        {trade.learnings ? (
          <Card>
            <Text style={{ color: theme.text.primary, fontWeight: "700", fontSize: theme.font.title, marginBottom: 6 }}>Notes</Text>
            <Muted>{trade.learnings}</Muted>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
