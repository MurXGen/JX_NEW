import React, { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionView } from "../components/motion";
import { ChevronDown, Plus, TrendingDown, TrendingUp } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { H1, Muted, Badge, Card } from "../components/ui";

function JournalSwitcher() {
  const { theme } = useTheme();
  const { accounts, currentAccount, selectAccount } = useApp();
  const [open, setOpen] = useState(false);
  if (!accounts.length) return null;
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.bg.muted, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" }}
      >
        <Text style={{ color: theme.text.primary, fontWeight: "600", fontSize: theme.font.body }}>
          {currentAccount?.name || "Journal"}
        </Text>
        <ChevronDown size={16} color={theme.text.muted} />
      </Pressable>
      {open && (
        <Card flat style={{ marginTop: 6, padding: 6, gap: 2 }}>
          {accounts.map((a) => (
            <Pressable
              key={a._id}
              onPress={() => { selectAccount(a._id); setOpen(false); }}
              style={{ paddingVertical: 10, paddingHorizontal: 10, borderRadius: theme.radius.sm, backgroundColor: a._id === currentAccount?._id ? theme.primarySubtle : "transparent" }}
            >
              <Text style={{ color: theme.text.primary, fontSize: theme.font.body }}>{a.name}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );
}

function TradeRow({ trade, index, currency, onPress }) {
  const { theme } = useTheme();
  const pnl = Number(trade.pnl) || 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const up = pnl >= 0;
  const date = trade.closeTime || trade.openTime;
  return (
    <MotionView delay={Math.min(index, 10) * 40}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          backgroundColor: theme.bg.surface, borderColor: theme.border, borderWidth: 1,
          borderRadius: theme.radius.md, padding: theme.space[4], marginBottom: theme.space[3],
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ color: theme.text.primary, fontWeight: "700", fontSize: theme.font.bodyMd }}>
              {trade.symbol || trade.ticker || "—"}
            </Text>
            <Badge tone={isLong ? "success" : "danger"}>{isLong ? "LONG" : "SHORT"}</Badge>
          </View>
          <Muted style={{ fontSize: theme.font.caption, marginTop: 2 }}>
            {date ? new Date(date).toLocaleDateString() : trade.tradeStatus || ""}
          </Muted>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {up ? <TrendingUp size={15} color={theme.success} /> : <TrendingDown size={15} color={theme.danger} />}
          <Text style={{ color: up ? theme.successStrong : theme.dangerStrong, fontWeight: "700", fontSize: theme.font.bodyMd }}>
            {up ? "+" : "−"}{currency}{Math.abs(pnl).toLocaleString()}
          </Text>
        </View>
      </Pressable>
    </MotionView>
  );
}

export default function TradesScreen({ navigation }) {
  const { theme } = useTheme();
  const { trades, currentAccount, refresh } = useApp();
  const [refreshing, setRefreshing] = useState(false);

  const sorted = [...trades].sort(
    (a, b) => new Date(b.closeTime || b.openTime || 0) - new Date(a.closeTime || a.openTime || 0),
  );
  const currency = currentAccount?.currency === "INR" ? "₹" : "$";

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }} edges={["top"]}>
      <View style={{ padding: theme.space[5], paddingBottom: theme.space[3], gap: theme.space[3] }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <H1>Trades</H1>
          <Pressable
            onPress={() => navigation.navigate("LogTrade")}
            style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 9 }}
          >
            <Plus size={16} color={theme.primaryText} />
            <Text style={{ color: theme.primaryText, fontWeight: "700" }}>Log</Text>
          </Pressable>
        </View>
        <JournalSwitcher />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(t, i) => t._id || String(i)}
        contentContainerStyle={{ paddingHorizontal: theme.space[5], paddingBottom: theme.space[8] }}
        renderItem={({ item, index }) => (
          <TradeRow
            trade={item}
            index={index}
            currency={currency}
            onPress={() => navigation.navigate("TradeDetails", { trade: item })}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.text.muted} />}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: theme.space[8] }}>
            <Muted>No trades yet — tap Log to add your first.</Muted>
          </View>
        }
      />
    </SafeAreaView>
  );
}
