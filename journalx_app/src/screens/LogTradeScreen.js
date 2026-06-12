import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  AlertTriangle, Clock, Flame, Image as ImageIcon, LineChart, Pencil, Star,
  TrendingDown, TrendingUp, Upload, X, Zap, Plus, CandlestickChart, ListChecks,
} from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Toast, Grad, GlassBackdrop } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { font } from "../theme/typography";
import { money, currencySymbol, fmt } from "../lib/format";
import { computeTrade, num, detectSession } from "../lib/tradeCalc";
import { addTrade, updateTrade } from "../api/trades";
import { apiErrorMessage } from "../lib/error";
import { getItem, setItem } from "../lib/storage";

const DEFAULT_STRATEGIES = ["Breakout", "Pullback", "Reversal", "Range", "Trend-follow", "News"];
const DEFAULT_EMOTIONS = ["Calm", "Confident", "FOMO", "Revenge", "Hesitant"];
const DEFAULT_SYMBOLS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "XAU/USD", "EUR/USD", "NIFTY", "AAPL", "TSLA"];
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "1D"];
const MISTAKES = ["None", "Moved stop", "Oversized", "No stop", "Chased entry", "Exited early"];
const MARKETS = ["Trending", "Ranging", "Volatile"];
const MAX_IMAGES = 4;
const MAX_BYTES = 10 * 1024 * 1024;

const EMPTY = {
  symbol: "", direction: "long", entry: "", exit: "", size: "", sizeUnit: "asset",
  leverage: "", feeValue: "", feeUnit: "percent", stopLoss: "", takeProfit: "",
  entryTime: "", exitTime: "", strategy: null, market: null, timeframe: null, tfCustom: "",
  confidence: 0, emotion: null, followedPlan: false, mistakes: [], notes: "",
  logMethod: "pnl", netPnl: "", screenshots: [],
};

/* map an existing trade back into the editable form */
function tradeToForm(tr) {
  const tf = tr.timeframe || null;
  const known = TIMEFRAMES.includes(tf);
  let mistakes = [];
  try { mistakes = Array.isArray(tr.mistakes) ? tr.mistakes : JSON.parse(tr.mistakes || "[]"); } catch {}
  const hasEntry = !!Number(tr.avgEntryPrice);
  return {
    ...EMPTY,
    symbol: tr.symbol || tr.ticker || "",
    direction: (tr.direction || "long").toLowerCase(),
    entry: hasEntry ? String(tr.avgEntryPrice) : "",
    exit: Number(tr.avgExitPrice) ? String(tr.avgExitPrice) : "",
    size: Number(tr.totalQuantity) ? String(tr.totalQuantity) : "",
    sizeUnit: "asset",
    leverage: tr.leverage ? String(tr.leverage) : "",
    feeValue: tr.openFeeValue ? String(tr.openFeeValue) : "",
    feeUnit: tr.feeType || "percent",
    stopLoss: Number(tr.avgSLPrice) ? String(tr.avgSLPrice) : "",
    takeProfit: Number(tr.avgTPPrice) ? String(tr.avgTPPrice) : "",
    entryTime: tr.openTime || "",
    exitTime: tr.closeTime || "",
    strategy: tr.strategy || null,
    market: tr.marketCondition || null,
    timeframe: known ? tf : (tf ? "custom" : null),
    tfCustom: known ? "" : (tf ? String(tf).replace(/m$/, "") : ""),
    confidence: Number(tr.confidence) || 0,
    emotion: tr.emotion || null,
    followedPlan: !!tr.rulesFollowed,
    mistakes,
    notes: tr.learnings || "",
    logMethod: hasEntry ? "entryexit" : "pnl",
    netPnl: tr.pnl != null ? String(tr.pnl) : "",
    screenshots: [],
  };
}

export default function LogTradeScreen({ navigation, route }) {
  const { theme } = useTheme();
  const t = theme;
  const { currentAccount, addTradeLocal, refresh } = useApp();
  const editing = route?.params?.trade || null;

  const [mode, setMode] = useState(editing ? (Number(editing.avgEntryPrice) ? "detailed" : "quick") : "quick");
  const [form, setForm] = useState(editing ? tradeToForm(editing) : EMPTY);
  const [symbols, setSymbols] = useState(DEFAULT_SYMBOLS);
  const [customStrategies, setCustomStrategies] = useState([]);
  const [customEmotions, setCustomEmotions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const flash = (type, msg) => { setToast({ type, msg }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const stored = getItem("jx-symbols");
    if (Array.isArray(stored) && stored.length) setSymbols(stored);
    setCustomStrategies(getItem("jx-custom-strategies") || []);
    setCustomEmotions(getItem("jx-custom-emotions") || []);
  }, []);

  const calc = useMemo(() => computeTrade(form), [form]);
  const isQuick = mode === "quick";
  const timeframeValue = form.timeframe === "custom" ? (form.tfCustom ? `${form.tfCustom}m` : "") : form.timeframe || "";
  const session = detectSession(form.entryTime);
  const sym = currencySymbol(currentAccount?.currency);

  const checks = useMemo(() => [
    { label: "Risk set (SL/TP)", xp: 20, ok: form.stopLoss !== "" && form.takeProfit !== "" },
    { label: "Strategy tagged", xp: 10, ok: !!form.strategy },
    { label: "Emotion logged", xp: 10, ok: !!form.emotion },
    { label: "Notes added", xp: 10, ok: form.notes.trim().length > 0 },
  ], [form]);
  const quality = useMemo(() => {
    if (isQuick) {
      if (form.logMethod === "pnl") return form.netPnl !== "" ? 30 : 10;
      return form.entry && form.exit && form.size ? 45 : 15;
    }
    let q = 0;
    if (form.symbol) q += 10;
    if (form.entry && form.exit && form.size) q += 25;
    q += checks.reduce((s, c) => s + (c.ok ? c.xp : 0), 0);
    return Math.min(100, q);
  }, [isQuick, form, checks]);
  const qualityLabel = quality >= 70 ? "Strong log" : quality >= 40 ? "Good log" : "Basic log";

  const quickPnl = form.logMethod === "pnl" ? num(form.netPnl) : calc.pnl;
  const quickOutcome = quickPnl == null ? null : quickPnl >= 0 ? "Win" : "Loss";
  const previewPnl = isQuick && form.logMethod === "pnl" ? num(form.netPnl) : calc.pnl;

  const totalBytes = form.screenshots.reduce((s, i) => s + (i.size || 0), 0);
  const pickImages = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return flash("danger", "Allow photo access to add screenshots");
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7, allowsMultipleSelection: true, selectionLimit: MAX_IMAGES - form.screenshots.length,
      });
      if (res.canceled) return;
      let bytes = totalBytes;
      const next = [...form.screenshots];
      for (const a of res.assets || []) {
        if (next.length >= MAX_IMAGES) { flash("danger", `Max ${MAX_IMAGES} screenshots`); break; }
        const size = a.fileSize || 0;
        if (bytes + size > MAX_BYTES) { flash("danger", "Screenshots exceed the 10MB limit"); break; }
        bytes += size;
        next.push({ uri: a.uri, name: a.fileName || `shot-${next.length}.jpg`, type: a.mimeType || "image/jpeg", size });
      }
      set("screenshots", next);
    } catch {
      flash("danger", "Could not open the photo library");
    }
  };

  const addCustom = (kind, v) => {
    if (kind === "strategy") {
      const next = [...new Set([...customStrategies, v])];
      setCustomStrategies(next); setItem("jx-custom-strategies", next); set("strategy", v);
    } else {
      const next = [...new Set([...customEmotions, v])];
      setCustomEmotions(next); setItem("jx-custom-emotions", next); set("emotion", v);
    }
  };

  const save = async () => {
    if (!currentAccount) return flash("danger", "No journal selected");
    if (!form.symbol.trim()) return flash("danger", "Pick a symbol first");
    if (isQuick && form.logMethod === "pnl") {
      if (form.netPnl === "") return flash("danger", "Enter your net P&L");
    } else if (!(num(form.entry) && num(form.size))) {
      return flash("danger", "Entry price and position size are required");
    }
    const symU = form.symbol.trim().toUpperCase();
    if (symU && !symbols.includes(symU)) {
      const next = [symU, ...symbols];
      setSymbols(next); setItem("jx-symbols", next);
    }
    setBusy(true);
    try {
      const payload = { ...form, symbol: symU, timeframe: timeframeValue, accountId: currentAccount._id, mode, logMethod: form.logMethod, netPnl: form.netPnl };
      if (editing) {
        await updateTrade(editing._id, payload);
        await refresh();
        flash("success", "Trade updated");
        setTimeout(() => navigation.goBack(), 600);
        return;
      }
      const trade = await addTrade(payload);
      if (!trade || !trade._id) { flash("danger", "Server didn't confirm the save — not stored."); return; }
      addTradeLocal(trade);
      flash("success", "Trade logged");
      setTimeout(() => navigation.goBack(), 700);
    } catch (e) {
      flash("danger", apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const assetLabel = form.symbol ? form.symbol.split("/")[0].slice(0, 5) : "Asset";

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <Toast toast={toast} />
      {busy && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
          <View style={{ backgroundColor: t.bg.elevated, borderRadius: t.radius.lg, paddingVertical: t.space[5], paddingHorizontal: t.space[6], alignItems: "center", gap: 12 }}>
            <ActivityIndicator size="large" color={t.yellow[400]} />
            <Text style={{ fontFamily: font(600), fontSize: t.font.body, color: t.text.primary }}>{editing ? "Saving changes…" : "Saving your trade…"}</Text>
          </View>
        </View>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: t.space[5] }}>
        <Text style={{ fontFamily: font(700), fontSize: t.font.h2, color: t.text.primary }}>{editing ? "Edit trade" : isQuick ? "Quick log" : "Log a trade"}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}><X size={24} color={t.text.muted} /></Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: t.space[5], paddingTop: 0, gap: t.space[4], paddingBottom: t.space[8] }} keyboardShouldPersistTaps="handled">
          <Seg t={t} items={[{ value: "quick", label: "Quick log" }, { value: "detailed", label: "Detailed" }]} value={mode} onChange={setMode} />

          {/* quality */}
          <View style={{ alignItems: "center", gap: 2 }}>
            <QualityRing t={t} pct={quality} />
            <Text style={{ fontFamily: font(700), fontSize: t.font.bodyMd, color: t.text.primary }}>{qualityLabel}</Text>
            <Muted2 t={t}>Journal: {currentAccount?.name || "—"}</Muted2>
          </View>

          {/* ===== Asset & direction ===== */}
          <SectionCard t={t} icon={CandlestickChart} title="Asset & direction">
            <FieldLabel t={t} label="Symbol">
              <Box t={t}>
                <TextInput value={form.symbol} onChangeText={(v) => set("symbol", v.toUpperCase())} placeholder="Search or type a symbol…" placeholderTextColor={t.text.muted} autoCapitalize="characters" style={{ color: t.text.primary, fontFamily: font(500), fontSize: t.font.body, paddingVertical: 12, paddingHorizontal: 14 }} />
              </Box>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {symbols.slice(0, 6).map((s) => (
                  <ChipBtn key={s} t={t} selected={form.symbol === s} onPress={() => set("symbol", s)}>{s.split("/")[0]}</ChipBtn>
                ))}
              </View>
            </FieldLabel>
            <DirButtons t={t} value={form.direction} onChange={(v) => set("direction", v)} />
          </SectionCard>

          {isQuick ? (
            <>
              {/* ===== Result ===== */}
              <SectionCard t={t} icon={ListChecks} title="Result">
                <FieldLabel t={t} label="How do you want to log?">
                  <Seg t={t} items={[{ value: "entryexit", label: "Entry & exit" }, { value: "pnl", label: "P&L only" }]} value={form.logMethod} onChange={(v) => set("logMethod", v)} />
                </FieldLabel>

                {form.logMethod === "pnl" ? (
                  <FieldLabel t={t} label="Net P&L (use − for a loss)">
                    <NumBox t={t} value={form.netPnl} onChangeText={(v) => set("netPnl", v)} placeholder="e.g. 1290 or -340" right={quickOutcome ? <Tag t={t} tone={quickPnl >= 0 ? "success" : "danger"}>{quickOutcome}</Tag> : null} />
                  </FieldLabel>
                ) : (
                  <>
                    <Row2>
                      <FieldLabel t={t} label="Entry price" flex><NumBox t={t} value={form.entry} onChangeText={(v) => set("entry", v)} placeholder="0.00" /></FieldLabel>
                      <FieldLabel t={t} label="Exit price" flex><NumBox t={t} value={form.exit} onChangeText={(v) => set("exit", v)} placeholder="0.00" /></FieldLabel>
                    </Row2>
                    <FieldLabel t={t} label="Position size"><SizeField t={t} form={form} set={set} assetLabel={assetLabel} /></FieldLabel>
                  </>
                )}

                <FieldLabel t={t} label="Date & time"><TimeField t={t} value={form.exitTime} onChange={(v) => set("exitTime", v)} /></FieldLabel>
              </SectionCard>

              <SectionCard t={t} icon={ImageIcon} title="Screenshots & note" hint="optional">
                <ScreenshotsField t={t} items={form.screenshots} onAdd={pickImages} onRemove={(i) => set("screenshots", form.screenshots.filter((_, idx) => idx !== i))} totalBytes={totalBytes} />
                <Box t={t}><TextInput value={form.notes} onChangeText={(v) => set("notes", v)} placeholder="e.g. Breakout retest, clean setup" placeholderTextColor={t.text.muted} style={{ color: t.text.primary, fontFamily: font(400), paddingVertical: 12, paddingHorizontal: 14 }} /></Box>
              </SectionCard>
            </>
          ) : (
            <>
              {/* ===== Entry, exit & size ===== */}
              <SectionCard t={t} icon={LineChart} title="Entry, exit & size" hint="P&L auto-calculates">
                <Row2>
                  <FieldLabel t={t} label="Entry price" flex><NumBox t={t} value={form.entry} onChangeText={(v) => set("entry", v)} placeholder="61240" /></FieldLabel>
                  <FieldLabel t={t} label="Exit price" flex><NumBox t={t} value={form.exit} onChangeText={(v) => set("exit", v)} placeholder="63820" /></FieldLabel>
                </Row2>
                <FieldLabel t={t} label="Position size"><SizeField t={t} form={form} set={set} assetLabel={assetLabel} /></FieldLabel>
                <Text style={{ fontSize: t.font.caption, color: t.text.muted, marginTop: -4 }}>Entry &amp; exit are prices per unit. To enter a dollar amount, switch the size toggle to USD.</Text>
                <FieldLabel t={t} label="Leverage">
                  <NumBox t={t} value={form.leverage} onChangeText={(v) => set("leverage", v)} placeholder="1" right={<Text style={{ color: t.text.muted, paddingRight: 14, fontFamily: font(600) }}>×</Text>} />
                  <Text style={{ fontSize: t.font.caption, color: t.text.muted }}>Leave as 1 if you don&apos;t use leverage (spot). It scales position size, not your entry price.</Text>
                </FieldLabel>
                <FieldLabel t={t} label="Fees"><FeeField t={t} form={form} set={set} /></FieldLabel>
                {calc.notional != null && (
                  <Banner t={t} tone="neutral">
                    <Text style={{ color: t.text.secondary, fontSize: t.font.small }}>
                      Position value <Text style={{ fontFamily: font(700), color: t.text.primary }}>{sym}{fmt(calc.notional, 2)}</Text>
                      {form.feeUnit === "percent" && calc.feeAmount > 0 ? `  ·  fee ${sym}${fmt(calc.feeAmount, 2)}` : ""}
                    </Text>
                  </Banner>
                )}
                {calc.pnl != null && (
                  <Banner t={t} tone={calc.pnl >= 0 ? "success" : "danger"}>
                    <Text style={{ color: t.text.secondary, fontSize: t.font.small }}>
                      Net P&L <Text style={{ fontFamily: font(700), color: calc.pnl >= 0 ? t.successStrong : t.dangerStrong }}>{money(calc.pnl, sym)}</Text>
                      {calc.retPct != null ? `  ·  ${calc.retPct >= 0 ? "+" : ""}${fmt(calc.retPct, 1)}%` : ""}
                      {calc.realizedR != null ? `  ·  ${fmt(calc.realizedR, 1)}R` : ""}
                    </Text>
                  </Banner>
                )}
              </SectionCard>

              {/* ===== Risk ===== */}
              <SectionCard t={t} icon={AlertTriangle} title="Risk management" hint="Powers your R-multiples">
                <Row2>
                  <FieldLabel t={t} label="Stop loss" flex><NumBox t={t} value={form.stopLoss} onChangeText={(v) => set("stopLoss", v)} placeholder="60100" /></FieldLabel>
                  <FieldLabel t={t} label="Take profit" flex><NumBox t={t} value={form.takeProfit} onChangeText={(v) => set("takeProfit", v)} placeholder="66540" /></FieldLabel>
                </Row2>
                {calc.plannedRR != null && (
                  <Banner t={t} tone="warn">
                    <Text style={{ color: t.text.secondary, fontSize: t.font.small }}>
                      Planned R:R <Text style={{ fontFamily: font(700), color: t.text.primary }}>1 : {fmt(calc.plannedRR, 1)}</Text>
                      {calc.expectedLoss > 0 ? `  ·  risking ${sym}${fmt(calc.expectedLoss, 0)} to make ${sym}${fmt(calc.expectedProfit, 0)}` : ""}
                    </Text>
                  </Banner>
                )}
              </SectionCard>

              {/* ===== Timing ===== */}
              <SectionCard t={t} icon={Clock} title="Timing" hint="Auto session tag">
                <Row2>
                  <TimeField2 t={t} label="Entry" value={form.entryTime} onChange={(v) => set("entryTime", v)} />
                  <TimeField2 t={t} label="Exit" value={form.exitTime} onChange={(v) => set("exitTime", v)} />
                </Row2>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {session && <ChipBtn t={t} disabled><Clock size={12} color={t.text.muted} /> {session}</ChipBtn>}
                  <ChipBtn t={t} selected onPress={() => { const n = new Date().toISOString(); setForm((f) => ({ ...f, entryTime: f.entryTime || n, exitTime: n })); }}>
                    <Zap size={12} color={t.primaryText} /> Set to now
                  </ChipBtn>
                </View>
              </SectionCard>

              {/* ===== Context ===== */}
              <SectionCard t={t} icon={LineChart} title="Your edge — context" hint="Sharpens analytics">
                <FieldLabel t={t} label="Strategy / setup">
                  <ChipsWithCustom t={t} options={[...DEFAULT_STRATEGIES, ...customStrategies]} value={form.strategy} onSelect={(v) => set("strategy", v)} onAddCustom={(v) => addCustom("strategy", v)} />
                </FieldLabel>
                <FieldLabel t={t} label="Market condition">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {MARKETS.map((m) => <ChipBtn key={m} t={t} selected={form.market === m} onPress={() => set("market", form.market === m ? null : m)}>{m}</ChipBtn>)}
                  </View>
                </FieldLabel>
                <FieldLabel t={t} label="Timeframe">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                    {TIMEFRAMES.map((tf) => <ChipBtn key={tf} t={t} selected={form.timeframe === tf} onPress={() => set("timeframe", form.timeframe === tf ? null : tf)}>{tf}</ChipBtn>)}
                    <ChipBtn t={t} selected={form.timeframe === "custom"} onPress={() => set("timeframe", form.timeframe === "custom" ? null : "custom")}>Custom</ChipBtn>
                    {form.timeframe === "custom" && (
                      <Box t={t} style={{ width: 90 }}><TextInput value={form.tfCustom} onChangeText={(v) => set("tfCustom", v)} placeholder="mins" keyboardType="number-pad" placeholderTextColor={t.text.muted} style={{ color: t.text.primary, paddingVertical: 8, paddingHorizontal: 10 }} /></Box>
                    )}
                  </View>
                </FieldLabel>
              </SectionCard>

              {/* ===== Psychology ===== */}
              <SectionCard t={t} icon={Flame} title="Psychology & discipline" hint="Find behavioral leaks">
                <Stars t={t} value={form.confidence} onChange={(v) => set("confidence", v)} />
                <FieldLabel t={t} label="Emotion at entry">
                  <ChipsWithCustom t={t} options={[...DEFAULT_EMOTIONS, ...customEmotions]} value={form.emotion} onSelect={(v) => set("emotion", v)} onAddCustom={(v) => addCustom("emotion", v)} />
                </FieldLabel>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontFamily: font(600), fontSize: t.font.bodyMd, color: t.text.primary }}>Did you follow your plan?</Text>
                    <Text style={{ fontSize: t.font.caption, color: t.text.muted }}>Discipline is the #1 predictor of edge</Text>
                  </View>
                  <Toggle t={t} on={form.followedPlan} onChange={(v) => set("followedPlan", v)} />
                </View>
                <FieldLabel t={t} label="Mistakes (be honest)">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {MISTAKES.map((m) => {
                      const seld = form.mistakes.includes(m);
                      return (
                        <ChipBtn key={m} t={t} selected={seld} onPress={() => {
                          if (m === "None") return set("mistakes", seld ? [] : ["None"]);
                          const base = form.mistakes.filter((x) => x !== "None");
                          set("mistakes", seld ? base.filter((x) => x !== m) : [...base, m]);
                        }}>{m}</ChipBtn>
                      );
                    })}
                  </View>
                </FieldLabel>
              </SectionCard>

              {/* ===== Screenshots + Notes ===== */}
              <SectionCard t={t} icon={ImageIcon} title="Screenshots" hint="Worth +15 quality">
                <ScreenshotsField t={t} items={form.screenshots} onAdd={pickImages} onRemove={(i) => set("screenshots", form.screenshots.filter((_, idx) => idx !== i))} totalBytes={totalBytes} />
              </SectionCard>
              <SectionCard t={t} icon={Pencil} title="Notes" hint="Your thesis & lessons">
                <Box t={t}><TextInput value={form.notes} onChangeText={(v) => set("notes", v)} placeholder="What was your thesis? What would you repeat or avoid?" placeholderTextColor={t.text.muted} multiline style={{ color: t.text.primary, fontFamily: font(400), padding: 14, minHeight: 90, textAlignVertical: "top" }} /></Box>
              </SectionCard>
            </>
          )}

          {/* ===== Preview ===== */}
          <Preview t={t} form={form} calc={calc} pnl={previewPnl} sym={sym} quality={quality} timeframeValue={timeframeValue} />

          <Pressable onPress={save} disabled={busy} style={{ borderRadius: t.radius.md, paddingVertical: 15, alignItems: "center", opacity: busy ? 0.6 : 1, overflow: "hidden", shadowColor: t.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 }}>
            <Grad colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
            <Text style={{ color: t.primaryText, fontFamily: font(700), fontSize: t.font.bodyMd }}>{busy ? "Saving…" : editing ? "Save changes" : "Save trade"}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GradientBackground>
  );
}

/* ---------------- primitives ---------------- */
function Muted2({ t, children }) { return <Text style={{ color: t.text.muted, fontSize: t.font.small }}>{children}</Text>; }
function Box({ t, children, style }) {
  return <View style={[{ backgroundColor: t.glass.input, borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.md }, style]}>{children}</View>;
}
function FieldLabel({ t, label, children, flex }) {
  return (
    <View style={[{ gap: 6 }, flex && { flex: 1 }]}>
      <Text style={{ color: t.text.secondary, fontSize: t.font.small, fontFamily: font(500) }}>{label}</Text>
      {children}
    </View>
  );
}
function Row2({ children }) { return <View style={{ flexDirection: "row", gap: 12 }}>{children}</View>; }
function NumBox({ t, value, onChangeText, placeholder, right }) {
  return (
    <Box t={t}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TextInput value={String(value ?? "")} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={t.text.muted} keyboardType="numbers-and-punctuation" style={{ flex: 1, color: t.text.primary, fontFamily: font(500), fontSize: t.font.body, paddingVertical: 12, paddingHorizontal: 14 }} />
        {right}
      </View>
    </Box>
  );
}
function Seg({ t, items, value, onChange }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.glass.input, borderWidth: 1, borderColor: t.glass.border, borderRadius: t.radius.pill, padding: 4 }}>
      {items.map((it) => {
        const active = it.value === value;
        return (
          <Pressable key={it.value} onPress={() => onChange(it.value)} style={{ flex: 1, paddingVertical: 9, borderRadius: t.radius.pill, overflow: "hidden", alignItems: "center" }}>
            {active && <Grad colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
            <Text style={{ color: active ? t.primaryText : t.text.muted, fontFamily: font(600), fontSize: t.font.body }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
/* compact unit toggle — fixed width, never overflows */
function UnitToggle({ t, value, onChange, options }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.bg.muted, borderRadius: t.radius.md, padding: 3 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: t.radius.sm, backgroundColor: active ? t.bg.surface : "transparent" }}>
            <Text style={{ color: active ? t.text.primary : t.text.muted, fontFamily: font(600), fontSize: t.font.small }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function SizeField({ t, form, set, assetLabel }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Box t={t} style={{ flex: 1 }}>
        <TextInput value={String(form.size ?? "")} onChangeText={(v) => set("size", v)} placeholder={form.sizeUnit === "usd" ? "5000" : "0.5"} placeholderTextColor={t.text.muted} keyboardType="numbers-and-punctuation" style={{ color: t.text.primary, fontFamily: font(500), paddingVertical: 12, paddingHorizontal: 14 }} />
      </Box>
      <UnitToggle t={t} value={form.sizeUnit} onChange={(v) => set("sizeUnit", v)} options={[{ value: "asset", label: assetLabel }, { value: "usd", label: "USD" }]} />
    </View>
  );
}
function FeeField({ t, form, set }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
      <Box t={t} style={{ flex: 1 }}>
        <TextInput value={String(form.feeValue ?? "")} onChangeText={(v) => set("feeValue", v)} placeholder={form.feeUnit === "percent" ? "0.1" : "12.40"} placeholderTextColor={t.text.muted} keyboardType="numbers-and-punctuation" style={{ color: t.text.primary, fontFamily: font(500), paddingVertical: 12, paddingHorizontal: 14 }} />
      </Box>
      <UnitToggle t={t} value={form.feeUnit} onChange={(v) => set("feeUnit", v)} options={[{ value: "percent", label: "%" }, { value: "currency", label: "USD" }]} />
    </View>
  );
}
function DirButtons({ t, value, onChange }) {
  const opts = [
    ["long", "Long", "Buy / go long", TrendingUp, t.successStrong],
    ["short", "Short", "Sell / go short", TrendingDown, t.dangerStrong],
  ];
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      {opts.map(([dir, title, sub, Icon, color]) => {
        const active = value === dir;
        return (
          <Pressable key={dir} onPress={() => onChange(dir)} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: t.radius.md, borderWidth: 1.5, borderColor: active ? color : t.glass.border, backgroundColor: active ? `${color}15` : t.glass.input }}>
            <Icon size={18} color={active ? color : t.text.muted} />
            <View>
              <Text style={{ fontFamily: font(700), color: active ? color : t.text.primary }}>{title}</Text>
              <Text style={{ fontSize: t.font.caption, color: t.text.muted }}>{sub}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
function ChipBtn({ t, children, selected, onPress, disabled }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, backgroundColor: selected ? t.primary : t.bg.muted, borderColor: selected ? t.primary : t.border }}>
      {selected && !disabled ? <CheckMini t={t} /> : null}
      <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: selected ? t.primaryText : t.text.secondary }}>{children}</Text>
    </Pressable>
  );
}
function CheckMini({ t }) { return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.primaryText }} />; }
function ChipsWithCustom({ t, options, value, onSelect, onAddCustom }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState("");
  const commit = () => { const v = text.trim(); if (v) onAddCustom(v); setText(""); setAdding(false); };
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
      {options.map((o) => <ChipBtn key={o} t={t} selected={value === o} onPress={() => onSelect(value === o ? null : o)}>{o}</ChipBtn>)}
      {adding ? (
        <Box t={t} style={{ width: 140 }}>
          <TextInput autoFocus value={text} onChangeText={setText} onBlur={commit} onSubmitEditing={commit} placeholder="Add custom…" placeholderTextColor={t.text.muted} style={{ color: t.text.primary, paddingVertical: 7, paddingHorizontal: 10 }} />
        </Box>
      ) : (
        <Pressable onPress={() => setAdding(true)} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderStyle: "dashed", borderColor: t.borderStrong }}>
          <Plus size={13} color={t.text.secondary} />
          <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: t.text.secondary }}>Custom</Text>
        </Pressable>
      )}
    </View>
  );
}
function Stars({ t, value, onChange }) {
  const label = value <= 0 ? "" : value <= 2 ? "Low" : value === 3 ? "Medium" : "High";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: t.font.small, color: t.text.secondary, marginRight: 4 }}>Confidence</Text>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => onChange(n === value ? 0 : n)} hitSlop={4}>
          <Star size={22} color={n <= value ? t.yellow[500] : t.borderStrong} fill={n <= value ? t.yellow[400] : "transparent"} />
        </Pressable>
      ))}
      {label ? <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: t.text.primary }}>{label}</Text> : null}
    </View>
  );
}
function Toggle({ t, on, onChange }) {
  return (
    <Pressable onPress={() => onChange(!on)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: on ? t.successStrong : t.text.muted }}>{on ? "Yes" : "No"}</Text>
      <View style={{ width: 46, height: 28, borderRadius: 999, backgroundColor: on ? t.success : t.bg.muted, padding: 3, justifyContent: "center" }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: "#fff", alignSelf: on ? "flex-end" : "flex-start" }} />
      </View>
    </Pressable>
  );
}
function SectTitle({ t, icon: Icon, title, hint }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: t.primarySubtle, alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={t.yellow[500]} />
        </View>
        <Text style={{ fontFamily: font(700), fontSize: t.font.bodyMd, color: t.text.primary }}>{title}</Text>
      </View>
      {hint ? <Text style={{ fontSize: t.font.caption, color: t.text.muted }}>{hint}</Text> : null}
    </View>
  );
}
function SectionCard({ t, icon, title, hint, children }) {
  return (
    <View style={{ borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.xl, padding: t.space[4], gap: t.space[4], overflow: "hidden" }}>
      <GlassBackdrop />
      <Grad colors={[t.glass.highlight, "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5 }} />
      <SectTitle t={t} icon={icon} title={title} hint={hint} />
      {children}
    </View>
  );
}
function Banner({ t, tone, children }) {
  const colors = { success: t.successSubtle, danger: t.dangerSubtle, warn: t.primarySubtle, neutral: t.bg.muted };
  return <View style={{ backgroundColor: colors[tone] || t.bg.muted, borderRadius: t.radius.md, padding: 12 }}>{children}</View>;
}
function Tag({ t, tone, children }) {
  const c = tone === "success" ? t.successStrong : t.dangerStrong;
  return <View style={{ paddingHorizontal: 10 }}><Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: c }}>{children}</Text></View>;
}
function TimeField({ t, value, onChange }) { return <TimeFieldInner t={t} value={value} onChange={onChange} />; }
function TimeField2({ t, label, value, onChange }) {
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: t.text.secondary, fontSize: t.font.small, fontFamily: font(500) }}>{label}</Text>
      <TimeFieldInner t={t} value={value} onChange={onChange} />
    </View>
  );
}
function TimeFieldInner({ t, value, onChange }) {
  const [show, setShow] = useState(false);
  const [pmode, setPmode] = useState("date");
  const display = value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Tap to set";
  const open = () => { setPmode("date"); setShow(true); };
  const handle = (event, selected) => {
    if (event.type === "dismissed" || !selected) { setShow(false); setPmode("date"); return; }
    if (Platform.OS === "ios") { onChange(selected.toISOString()); return; }
    const base = value ? new Date(value) : new Date();
    if (pmode === "date") {
      base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(base.toISOString()); setPmode("time");
    } else {
      base.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      onChange(base.toISOString()); setShow(false); setPmode("date");
    }
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <Pressable onPress={open} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: t.glass.input, borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.md, paddingVertical: 12, paddingHorizontal: 14 }}>
          <Clock size={14} color={t.text.muted} />
          <Text style={{ color: value ? t.text.primary : t.text.muted, fontFamily: font(500), fontSize: t.font.small, flex: 1 }}>{display}</Text>
        </Pressable>
        <Pressable onPress={() => onChange(new Date().toISOString())} hitSlop={6} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: t.radius.sm, backgroundColor: t.bg.muted }}>
          <Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: t.text.secondary }}>Now</Text>
        </Pressable>
        {value ? <Pressable onPress={() => onChange("")} hitSlop={8}><X size={16} color={t.text.muted} /></Pressable> : null}
      </View>
      {show && <DateTimePicker value={value ? new Date(value) : new Date()} mode={Platform.OS === "ios" ? "datetime" : pmode} display="default" onChange={handle} />}
    </View>
  );
}
function ScreenshotsField({ t, items, onAdd, onRemove, totalBytes }) {
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((img, i) => (
          <View key={i} style={{ position: "relative" }}>
            <Image source={{ uri: img.uri }} style={{ width: 68, height: 68, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.border }} />
            <Pressable onPress={() => onRemove(i)} hitSlop={6} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: t.danger, alignItems: "center", justifyContent: "center" }}>
              <X size={12} color="#fff" />
            </Pressable>
          </View>
        ))}
        {items.length < MAX_IMAGES && (
          <Pressable onPress={onAdd} style={{ width: 68, height: 68, borderRadius: t.radius.sm, borderWidth: 1, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 2 }}>
            <Upload size={16} color={t.text.muted} />
            <Text style={{ fontSize: 10, color: t.text.muted }}>Add</Text>
          </Pressable>
        )}
      </View>
      <Text style={{ fontSize: t.font.caption, color: t.text.muted }}>{items.length}/{MAX_IMAGES} · {(totalBytes / 1024 / 1024).toFixed(1)}MB of 10MB</Text>
    </View>
  );
}
function QualityRing({ t, pct }) {
  const r = 44, c = 2 * Math.PI * r;
  return (
    <Svg width={112} height={112} viewBox="0 0 112 112">
      <Circle cx="56" cy="56" r={r} fill="none" stroke={t.bg.muted} strokeWidth="10" />
      <Circle cx="56" cy="56" r={r} fill="none" stroke={t.primary} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform="rotate(-90 56 56)" />
      <SvgText x="56" y="54" textAnchor="middle" fontSize="22" fontWeight="700" fill={t.text.primary}>{`${pct}%`}</SvgText>
      <SvgText x="56" y="72" textAnchor="middle" fontSize="9" fill={t.text.muted}>complete</SvgText>
    </Svg>
  );
}
/* live preview of the trade being logged */
function Preview({ t, form, calc, pnl, sym, quality, timeframeValue }) {
  const isLong = form.direction === "long";
  const rows = [
    ["Entry → Exit", form.entry || form.exit ? `${form.entry || "—"} → ${form.exit || "—"}` : "—"],
    ["Size", form.size ? `${form.size} ${form.sizeUnit === "usd" ? "USD" : ""}`.trim() : "—"],
    ["P&L", pnl != null ? money(pnl, sym) : "—"],
    ["R:R", calc.plannedRR != null ? `1 : ${fmt(calc.plannedRR, 1)}` : "—"],
    ["Strategy", form.strategy || "—"],
    ["Timeframe", timeframeValue || "—"],
  ];
  return (
    <View style={{ borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.xl, padding: t.space[4], gap: 10, overflow: "hidden" }}>
      <GlassBackdrop strong />
      <Grad colors={t.gradients.statBrand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font(700), fontSize: t.font.bodyMd, color: t.text.primary }}>Preview</Text>
        <Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: t.text.muted }}>Quality {quality}%</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>{form.symbol || "—"}</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: isLong ? t.successSubtle : t.dangerSubtle }}>
          <Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: isLong ? t.successStrong : t.dangerStrong }}>{isLong ? "LONG" : "SHORT"}</Text>
        </View>
        {pnl != null && (
          <Text style={{ marginLeft: "auto", fontFamily: font(700), fontSize: t.font.bodyMd, color: pnl >= 0 ? t.successStrong : t.dangerStrong }}>{money(pnl, sym)}</Text>
        )}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {rows.map(([k, v]) => (
          <View key={k} style={{ width: "50%", paddingVertical: 4 }}>
            <Text style={{ fontSize: t.font.caption, color: t.text.muted }}>{k}</Text>
            <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: t.text.primary }} numberOfLines={1}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
