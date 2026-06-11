import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Button, Field, Input, Toast, H1, Muted } from "../components/ui";
import { addTrade } from "../api/trades";

function Segment({ options, value, onChange }) {
  const { theme } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: theme.bg.muted, borderRadius: theme.radius.md, padding: 4 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              paddingVertical: 9,
              borderRadius: theme.radius.sm,
              backgroundColor: active ? theme.bg.surface : "transparent",
              alignItems: "center",
            }}
          >
            <Text style={{ color: active ? theme.text.primary : theme.text.muted, fontWeight: "600", fontSize: theme.font.body }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function LogTradeScreen({ navigation }) {
  const { theme } = useTheme();
  const { currentAccount, addTradeLocal } = useApp();

  const [mode, setMode] = useState("quick");
  const [direction, setDirection] = useState("long");
  const [symbol, setSymbol] = useState("");
  const [pnl, setPnl] = useState("");
  const [entry, setEntry] = useState("");
  const [exit, setExit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [strategy, setStrategy] = useState("");
  const [emotion, setEmotion] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  const save = async () => {
    if (!currentAccount) return flash("danger", "No journal selected");
    if (!symbol.trim()) return flash("danger", "Enter a symbol");
    if (mode === "quick" && pnl === "") return flash("danger", "Enter the P&L");
    setBusy(true);
    try {
      const trade = await addTrade({
        accountId: currentAccount._id,
        symbol,
        direction,
        pnl: mode === "quick" ? pnl : pnl || 0,
        mode,
        entry,
        exit,
        stopLoss,
        takeProfit,
        strategy,
        emotion,
        notes,
      });
      addTradeLocal(trade);
      flash("success", "Trade logged");
      setTimeout(() => navigation.goBack(), 600);
    } catch (e) {
      flash("danger", e?.response?.data?.message || "Could not save — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }}>
      <Toast toast={toast} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: theme.space[5] }}>
        <H1>Log a trade</H1>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <X size={24} color={theme.text.muted} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: theme.space[5], paddingTop: 0, gap: theme.space[4] }}>
          <Muted>Journal: {currentAccount?.name || "—"}</Muted>

          <Segment
            options={[{ label: "Quick", value: "quick" }, { label: "Detailed", value: "detailed" }]}
            value={mode}
            onChange={setMode}
          />

          <Segment
            options={[{ label: "Long", value: "long" }, { label: "Short", value: "short" }]}
            value={direction}
            onChange={setDirection}
          />

          <Field label="Symbol">
            <Input value={symbol} onChangeText={setSymbol} placeholder="e.g. BTCUSDT" autoCapitalize="characters" />
          </Field>

          <Field label="P&L ($)">
            <Input value={pnl} onChangeText={setPnl} placeholder="e.g. 250 or -90" keyboardType="numbers-and-punctuation" />
          </Field>

          {mode === "detailed" && (
            <>
              <View style={{ flexDirection: "row", gap: theme.space[3] }}>
                <View style={{ flex: 1 }}>
                  <Field label="Entry">
                    <Input value={entry} onChangeText={setEntry} placeholder="0.00" keyboardType="numbers-and-punctuation" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Exit">
                    <Input value={exit} onChangeText={setExit} placeholder="0.00" keyboardType="numbers-and-punctuation" />
                  </Field>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: theme.space[3] }}>
                <View style={{ flex: 1 }}>
                  <Field label="Stop loss">
                    <Input value={stopLoss} onChangeText={setStopLoss} placeholder="0.00" keyboardType="numbers-and-punctuation" />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Take profit">
                    <Input value={takeProfit} onChangeText={setTakeProfit} placeholder="0.00" keyboardType="numbers-and-punctuation" />
                  </Field>
                </View>
              </View>
              <Field label="Strategy">
                <Input value={strategy} onChangeText={setStrategy} placeholder="e.g. Breakout retest" />
              </Field>
              <Field label="Emotion">
                <Input value={emotion} onChangeText={setEmotion} placeholder="e.g. Calm / FOMO / Revenge" />
              </Field>
              <Field label="Notes">
                <Input value={notes} onChangeText={setNotes} placeholder="What did you learn?" multiline />
              </Field>
            </>
          )}

          <Button title="Save trade" onPress={save} loading={busy} style={{ marginTop: theme.space[2] }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
