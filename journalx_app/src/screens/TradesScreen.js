import React, { useMemo, useState } from "react";
import { Alert, Image, LayoutAnimation, Modal, Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionView } from "../components/motion";
import { Activity, ArrowDownUp, BarChart3, CalendarDays, Check, CheckSquare, ChevronDown, ChevronRight, Clock, Download, FileDown, ImageIcon, LayoutGrid, LayoutList, ListChecks, Plus, SlidersHorizontal, Square, Trash2, TrendingDown, TrendingUp, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Muted, Badge, Card } from "../components/ui";
import { CustomizeButton, useHiddenSections } from "../components/customize";
import Accordion from "../components/Accordion";
import PnlCalendar from "../components/PnlCalendar";
import Heatmap from "../components/Heatmap";
import ImageModal from "../components/ImageModal";
import { deleteTrade, importTradesBulk } from "../api/trades";
import { computeStats, filterByRange, RANGES } from "../lib/analytics";
import { csvToTrades, SAMPLE_HEADERS } from "../lib/csv";
import { font } from "../theme/typography";
import { money, currencySymbol, fmt } from "../lib/format";

const SECTIONS = [
  { id: "performance", label: "Performance" },
  { id: "calendar", label: "Calendar" },
  { id: "heatmap", label: "Activity heatmap" },
  { id: "trades", label: "All trades" },
];

/* "Today | Mon" / "Yesterday | Sun" / "27th May, 2026 | Saturday" */
function ordinal(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function dayLabel(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  const today = new Date();
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const shortDow = d.toLocaleDateString("en-US", { weekday: "short" });
  if (same(d, today)) return `Today | ${shortDow}`;
  if (same(d, yest)) return `Yesterday | ${shortDow}`;
  const fullDow = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${ordinal(d.getDate())} ${month}, ${d.getFullYear()} | ${fullDow}`;
}

const SORTS = [
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
  { id: "pnl-high", label: "P&L: high → low" },
  { id: "pnl-low", label: "P&L: low → high" },
];

const firstImg = (tr) => {
  const im = (tr.images || [])[0];
  return im?.url || im || tr.openImageUrl || tr.closeImageUrl || null;
};
const imgUrls = (tr) => {
  const out = [];
  (tr.images || []).forEach((im) => { const u = im?.url || im; if (u) out.push(u); });
  if (tr.openImageUrl) out.push(tr.openImageUrl);
  if (tr.closeImageUrl) out.push(tr.closeImageUrl);
  return out;
};

function JournalSwitcher() {
  const { theme } = useTheme();
  const { accounts, currentAccount, selectAccount } = useApp();
  const [open, setOpen] = useState(false);
  if (!accounts.length) return null;
  return (
    <View>
      <Pressable onPress={() => setOpen((o) => !o)} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.bg.muted, borderRadius: theme.radius.md, paddingHorizontal: 12, paddingVertical: 8, alignSelf: "flex-start" }}>
        <Text style={{ color: theme.text.primary, fontFamily: font(600), fontSize: theme.font.body }}>{currentAccount?.name || "Journal"}</Text>
        <ChevronDown size={16} color={theme.text.muted} />
      </Pressable>
      {open && (
        <Card flat style={{ marginTop: 6, padding: 6, gap: 2 }}>
          {accounts.map((a) => (
            <Pressable key={a._id} onPress={() => { selectAccount(a._id); setOpen(false); }} style={{ paddingVertical: 10, paddingHorizontal: 10, borderRadius: theme.radius.sm, backgroundColor: a._id === currentAccount?._id ? theme.primarySubtle : "transparent" }}>
              <Text style={{ color: theme.text.primary, fontSize: theme.font.body }}>{a.name}</Text>
            </Pressable>
          ))}
        </Card>
      )}
    </View>
  );
}

function durationStr(open, close) {
  if (!open || !close) return null;
  const ms = new Date(close) - new Date(open);
  if (!(ms > 0)) return null;
  const h = ms / 36e5;
  if (h < 1) return `${Math.max(1, Math.round(ms / 6e4))}m`;
  if (h < 24) return `${h.toFixed(h < 10 ? 1 : 0)}h`;
  return `${Math.round(h / 24)}d`;
}

/* Trade card.
   - `feature` (Grid view): big image-forward card, one per row.
   - default (Cards view): compact list row with a small thumbnail. */
function TradeRow({ t, trade, index, sym, onOpen, onImages, selectMode, selected, last, feature }) {
  const pnl = Number(trade.pnl) || 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const up = pnl >= 0;
  const running = !trade.closeTime && trade.tradeStatus === "running";
  const isQuick = (trade.tradeStatus || "") === "quick";
  const thumb = firstImg(trade);
  // date lives on the day-group header now; show the exit time-of-day instead
  const exitTime = trade.closeTime ? new Date(trade.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const notional = Number(trade.quantityUSD) || 0;
  const retPct = trade.retPct != null ? Number(trade.retPct) : (notional ? (pnl / notional) * 100 : null);
  const rMult = trade.realizedR != null && Number.isFinite(Number(trade.realizedR)) ? Number(trade.realizedR) : null;
  const dur = durationStr(trade.openTime, trade.closeTime);
  const meta = [trade.strategy, trade.timeframe].filter(Boolean).join(" · ");
  const subText = retPct != null
    ? `${retPct >= 0 ? "+" : ""}${fmt(retPct, 1)}%${rMult != null ? ` · ${rMult >= 0 ? "+" : ""}${fmt(rMult, 1)}R` : ""}`
    : (rMult != null ? `${rMult >= 0 ? "+" : ""}${fmt(rMult, 1)}R` : "");

  /* ===== compact list row (Cards view) ===== */
  if (!feature) {
    const accent = running ? t.text.muted : up ? t.success : t.danger;
    return (
      <MotionView delay={Math.min(index, 10) * 30}>
        <Pressable onPress={onOpen} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12, paddingLeft: 10, borderBottomColor: t.border, borderBottomWidth: last ? 0 : 1, opacity: pressed ? 0.6 : 1 })}>
          <View style={{ position: "absolute", left: 0, top: 12, bottom: 12, width: 3, borderRadius: 3, backgroundColor: accent }} />
          {selectMode ? (selected ? <CheckSquare size={20} color={t.primary} /> : <Square size={20} color={t.text.muted} />) : null}
          <Pressable onPress={selectMode ? onOpen : onImages} style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden", backgroundColor: t.bg.muted, alignItems: "center", justifyContent: "center" }}>
            {thumb ? <Image source={{ uri: thumb }} style={{ width: 48, height: 48 }} /> : <ImageIcon size={18} color={t.text.muted} />}
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>{trade.symbol || trade.ticker || "—"}</Text>
              <Badge tone={isLong ? "success" : "danger"}>{isLong ? "LONG" : "SHORT"}</Badge>
              {running && <Badge tone="neutral">OPEN</Badge>}
              {isQuick && <Badge tone="warn">QUICK</Badge>}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
              {exitTime ? <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{exitTime}</Text> : null}
              {dur && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Clock size={11} color={t.text.muted} />
                  <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{dur}</Text>
                </View>
              )}
              {!!meta && <Text numberOfLines={1} style={{ flex: 1, color: t.text.muted, fontSize: t.font.caption }}>{meta}</Text>}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {up ? <TrendingUp size={15} color={t.success} /> : <TrendingDown size={15} color={t.danger} />}
              <Text style={{ color: up ? t.successStrong : t.dangerStrong, fontFamily: font(700), fontSize: t.font.bodyMd }}>{money(pnl, sym)}</Text>
            </View>
            {!!subText && <Text style={{ color: t.text.muted, fontSize: t.font.caption, marginTop: 2 }}>{subText}</Text>}
          </View>
          {!selectMode && <ChevronRight size={18} color={t.text.muted} style={{ marginLeft: 2 }} />}
        </Pressable>
      </MotionView>
    );
  }

  /* ===== big image-forward card (Grid view) ===== */
  const bannerH = 168;
  return (
    <MotionView delay={Math.min(index, 10) * 35}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          borderRadius: 16, overflow: "hidden", marginBottom: last ? 0 : 14,
          backgroundColor: t.bg.surface, borderWidth: 1, borderColor: selected ? t.primary : t.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        })}
      >
        <Pressable onPress={selectMode ? onOpen : onImages} style={{ height: bannerH, backgroundColor: t.bg.canvas }}>
          {thumb ? (
            <Image source={{ uri: thumb }} style={{ width: "100%", height: bannerH }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", margin: 10, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.borderStrong, gap: 6 }}>
              <ImageIcon size={28} color={t.text.muted} />
              <Text style={{ color: t.text.muted, fontFamily: font(600), fontSize: t.font.small }}>Tap to add screenshots</Text>
            </View>
          )}
          <View style={{ position: "absolute", top: 10, left: 10, flexDirection: "row", gap: 6 }}>
            <View style={{ backgroundColor: isLong ? "rgba(16,185,129,0.92)" : "rgba(239,68,68,0.92)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ color: "#fff", fontFamily: font(700), fontSize: t.font.caption }}>{isLong ? "LONG" : "SHORT"}</Text>
            </View>
            {running && <View style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: "#fff", fontFamily: font(700), fontSize: t.font.caption }}>OPEN</Text></View>}
            {isQuick && <View style={{ backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}><Text style={{ color: "#fff", fontFamily: font(700), fontSize: t.font.caption }}>QUICK</Text></View>}
          </View>
          <View style={{ position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: up ? "rgba(16,185,129,0.95)" : "rgba(239,68,68,0.95)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            {up ? <TrendingUp size={13} color="#fff" /> : <TrendingDown size={13} color="#fff" />}
            <Text style={{ color: "#fff", fontFamily: font(700), fontSize: t.font.small }}>{money(pnl, sym)}</Text>
          </View>
          {selectMode && (
            <View style={{ position: "absolute", bottom: 10, right: 10, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 999, padding: 3 }}>
              {selected ? <CheckSquare size={22} color={t.primaryText} fill={t.primary} /> : <Square size={22} color="#fff" />}
            </View>
          )}
        </Pressable>
        <View style={{ padding: 12, gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text numberOfLines={1} style={{ flex: 1, color: t.text.primary, fontFamily: font(800), fontSize: t.font.bodyMd }}>{trade.symbol || trade.ticker || "—"}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {!!subText && <Text style={{ color: up ? t.successStrong : t.dangerStrong, fontFamily: font(700), fontSize: t.font.small }}>{subText}</Text>}
              {!selectMode && <ChevronRight size={16} color={t.text.muted} />}
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {exitTime ? <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{exitTime}</Text> : null}
            {dur && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Clock size={11} color={t.text.muted} />
                <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{dur}</Text>
              </View>
            )}
            {!!meta && <Text numberOfLines={1} style={{ flex: 1, textAlign: "right", color: t.text.muted, fontSize: t.font.caption }}>{meta}</Text>}
          </View>
        </View>
      </Pressable>
    </MotionView>
  );
}

/* collapsible per-date box; trades render as compact rows or big cards */
function DateGroup({ t, grp, sym, view, selectMode, selected, onToggleSelect, onOpenTrade, onImages }) {
  const [open, setOpen] = useState(true);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpen((o) => !o);
  };
  const feature = view === "grid";
  return (
    <Card flat style={{ padding: t.space[3] }}>
      {/* day header (tap to collapse) */}
      <Pressable onPress={toggle} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: open ? 8 : 0, marginBottom: open ? 10 : 0, borderBottomColor: t.border, borderBottomWidth: open ? 1 : 0 }}>
        <Text style={{ fontFamily: font(700), fontSize: t.font.small, color: t.text.secondary, letterSpacing: 0.3 }}>{grp.label}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontFamily: font(500), fontSize: t.font.caption, color: t.text.muted }}>{grp.items.length} {grp.items.length === 1 ? "trade" : "trades"}</Text>
          <View style={{ backgroundColor: grp.net >= 0 ? t.successSubtle : t.dangerSubtle, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: grp.net >= 0 ? t.successStrong : t.dangerStrong }}>{money(grp.net, sym)}</Text>
          </View>
          <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
            <ChevronDown size={16} color={t.text.muted} />
          </View>
        </View>
      </Pressable>

      {open && (
        <View>
          {grp.items.map((item, i) => (
            <TradeRow key={item._id || `${grp.label}-${i}`} t={t} trade={item} index={i} sym={sym} feature={feature}
              last={i === grp.items.length - 1}
              selectMode={selectMode} selected={selected.has(item._id)}
              onOpen={() => (selectMode ? onToggleSelect(item._id) : onOpenTrade(item))}
              onImages={() => onImages(item)} />
          ))}
        </View>
      )}
    </Card>
  );
}

/* pill filter chip */
function FChip({ t, active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: active ? t.primary : t.bg.muted, borderColor: active ? t.primary : t.border, borderWidth: 1 }}>
      <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: active ? t.primaryText : t.text.secondary }}>{label}</Text>
    </Pressable>
  );
}

function KpiTile({ theme, label, value, color }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", backgroundColor: theme.bg.surface, borderColor: theme.border, borderWidth: 1, borderRadius: theme.radius.md, padding: theme.space[4] }}>
      <Text style={{ color: theme.text.muted, fontSize: theme.font.caption, marginBottom: 6 }}>{label}</Text>
      <Text style={{ color: color || theme.text.primary, fontSize: theme.font.h3, fontFamily: font(700) }}>{value}</Text>
    </View>
  );
}

export default function TradesScreen({ navigation }) {
  const { theme } = useTheme();
  const t = theme;
  const { trades, currentAccount, refresh, applyUserData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all"); // outcome: all | win | loss
  const [direction, setDirection] = useState("all"); // all | long | short
  const [sort, setSort] = useState("newest");
  const [range, setRange] = useState("ALL");
  const [sheet, setSheet] = useState(null); // null | "filter" | "sort"
  const [view, setView] = useState("cards"); // cards | grid
  const [imgTrade, setImgTrade] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [working, setWorking] = useState(false);
  const [importing, setImporting] = useState(false);
  const { hidden, toggle, reset, isVisible } = useHiddenSections("jx-trades-hidden");

  const sym = currencySymbol(currentAccount?.currency);
  const ranged = useMemo(() => filterByRange(trades, range), [trades, range]);
  const s = useMemo(() => computeStats(ranged), [ranged]);

  const filtered = useMemo(() => {
    let list = ranged.filter((tr) => {
      const p = Number(tr.pnl) || 0;
      if (filter === "win" && !(p > 0)) return false;
      if (filter === "loss" && !(p < 0)) return false;
      if (direction !== "all" && (tr.direction || "").toLowerCase() !== direction) return false;
      return true;
    });
    const ts = (tr) => new Date(tr.closeTime || tr.openTime || 0).getTime();
    const by = {
      newest: (a, b) => ts(b) - ts(a),
      oldest: (a, b) => ts(a) - ts(b),
      "pnl-high": (a, b) => (Number(b.pnl) || 0) - (Number(a.pnl) || 0),
      "pnl-low": (a, b) => (Number(a.pnl) || 0) - (Number(b.pnl) || 0),
    };
    return [...list].sort(by[sort] || by.newest);
  }, [ranged, filter, direction, sort]);

  // group sorted trades by day, preserving sort order of first appearance
  const groups = useMemo(() => {
    const g = new Map();
    filtered.forEach((tr) => {
      const k = dayLabel(tr.closeTime || tr.openTime);
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(tr);
    });
    return [...g.entries()].map(([label, items]) => ({
      label,
      items,
      net: items.reduce((a, tr) => a + (Number(tr.pnl) || 0), 0),
    }));
  }, [filtered]);

  const filterNet = filtered.reduce((acc, tr) => acc + (Number(tr.pnl) || 0), 0);
  const activeFilters = (filter !== "all" ? 1 : 0) + (direction !== "all" ? 1 : 0);
  const pf = s.profitFactor === Infinity ? "∞" : fmt(s.profitFactor, 2);

  const onRefresh = async () => { setRefreshing(true); await refresh(); setRefreshing(false); };

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const exitSelect = () => { setSelectMode(false); setSelected(new Set()); };
  const selectedTrades = filtered.filter((tr) => selected.has(tr._id));

  const exportSelected = async () => {
    const list = selectedTrades.length ? selectedTrades : filtered;
    const header = "Symbol,Direction,P&L,Status,Opened,Closed,Strategy,Emotion";
    const rows = list.map((tr) => [
      tr.symbol || tr.ticker || "", tr.direction || "", tr.pnl ?? 0, tr.tradeStatus || "",
      tr.openTime ? new Date(tr.openTime).toISOString() : "", tr.closeTime ? new Date(tr.closeTime).toISOString() : "",
      (tr.strategy || "").replace(/,/g, " "), (tr.emotion || "").replace(/,/g, " "),
    ].join(","));
    const csv = [header, ...rows].join("\n");
    try { await Share.share({ message: csv, title: "JournalX trades export" }); } catch {}
  };

  const deleteSelected = () => {
    if (!selected.size) return;
    Alert.alert("Delete trades", `Delete ${selected.size} selected trade${selected.size === 1 ? "" : "s"}? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          setWorking(true);
          let lastData = null;
          for (const id of selected) {
            try { const r = await deleteTrade(id); if (r?.userData) lastData = r.userData; } catch {}
          }
          if (lastData) applyUserData(lastData); else await refresh();
          setWorking(false);
          exitSelect();
        },
      },
    ]);
  };

  const runImport = async (text) => {
    const { trades: rows, skipped, total, error } = csvToTrades(text);
    if (error || !rows.length) {
      return Alert.alert("Couldn't import", error || "No valid trades found. Make sure the file has a header row and a 'symbol' column.");
    }
    setImporting(true);
    try {
      const r = await importTradesBulk(currentAccount?._id, rows);
      await refresh();
      const skipNote = skipped ? `\n${skipped} row${skipped === 1 ? "" : "s"} skipped (missing symbol).` : "";
      Alert.alert("Import complete", `${r?.message || `${rows.length} trades imported`}.${skipNote}`);
    } catch (e) {
      Alert.alert("Import failed", e?.response?.data?.message || "Could not import these trades. Check the file and try again.");
    } finally {
      setImporting(false);
    }
  };

  const importCsv = async () => {
    if (!currentAccount?._id) return Alert.alert("No journal", "Create or select a journal first.");
    let DocumentPicker, FileSystem;
    try {
      DocumentPicker = require("expo-document-picker");
      FileSystem = require("expo-file-system");
    } catch {
      return Alert.alert("Import unavailable", "Run: npx expo install expo-document-picker expo-file-system");
    }
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ["text/csv", "text/comma-separated-values", "application/vnd.ms-excel", "text/plain", "*/*"], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.length) return;
      const uri = res.assets[0].uri;
      const text = await FileSystem.readAsStringAsync(uri);
      Alert.alert(
        "Import trades?",
        `Import trades from "${res.assets[0].name}" into ${currentAccount?.name || "this journal"}?\n\nExpected columns: ${SAMPLE_HEADERS}`,
        [{ text: "Cancel", style: "cancel" }, { text: "Import", onPress: () => runImport(text) }]
      );
    } catch (e) {
      Alert.alert("Couldn't read file", "Please choose a valid .csv file.");
    }
  };

  const RangeTabs = () => (
    <View style={{ flexDirection: "row", backgroundColor: t.bg.muted, borderRadius: t.radius.md, padding: 3 }}>
      {RANGES.map((r) => {
        const active = r === range;
        return (
          <Pressable key={r} onPress={() => setRange(r)} style={{ flex: 1, paddingVertical: 7, borderRadius: t.radius.sm, backgroundColor: active ? t.bg.surface : "transparent", alignItems: "center" }}>
            <Text style={{ color: active ? t.text.primary : t.text.muted, fontFamily: font(active ? 700 : 500), fontSize: t.font.small }}>{r}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.canvas }} edges={["top"]}>
      <ImageModal visible={!!imgTrade} onClose={() => setImgTrade(null)} tradeId={imgTrade?._id} initialImages={imgTrade ? imgUrls(imgTrade) : []} onChange={() => refresh().catch(() => {})} />

      <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4], paddingBottom: t.space[8] }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.text.muted} />}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: font(700), fontSize: t.font.h2, color: t.text.primary }}>Trades</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <CustomizeButton sections={SECTIONS} hidden={hidden} onToggle={toggle} onReset={reset} />
            <Pressable onPress={importCsv} disabled={importing} style={{ width: 38, height: 38, borderRadius: t.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: t.bg.muted, borderWidth: 1, borderColor: t.border, opacity: importing ? 0.6 : 1 }}>
              <FileDown size={16} color={t.text.secondary} />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("LogTrade")} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.primary, borderRadius: t.radius.md, paddingHorizontal: 14, paddingVertical: 9 }}>
              <Plus size={16} color={t.primaryText} />
              <Text style={{ color: t.primaryText, fontFamily: font(700) }}>Log</Text>
            </Pressable>
          </View>
        </View>

        <JournalSwitcher />
        <RangeTabs />

        {isVisible("performance") && (
          <Accordion title="Performance" icon={BarChart3}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[3] }}>
              <KpiTile theme={t} label="Total trades" value={s.n} />
              <KpiTile theme={t} label="Win rate" value={`${s.winRate}%`} color={t.yellow[400]} />
              <KpiTile theme={t} label="Net P&L" value={money(s.net, sym)} color={s.net >= 0 ? t.successStrong : t.dangerStrong} />
              <KpiTile theme={t} label="Profit factor" value={pf} color={s.profitFactor >= 1 ? t.successStrong : t.dangerStrong} />
            </View>
          </Accordion>
        )}

        {isVisible("calendar") && (
          <Accordion title="Calendar" icon={CalendarDays}>
            <PnlCalendar trades={trades} sym={sym} />
          </Accordion>
        )}

        {isVisible("heatmap") && (
          <Accordion title="Activity heatmap" icon={Activity}>
            <Heatmap trades={trades} />
          </Accordion>
        )}

        {isVisible("trades") && (
          <View style={{ gap: t.space[3] }}>
            {/* row 1: title + net + select */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ListChecks size={18} color={t.text.primary} />
                <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>All trades</Text>
                <Text style={{ fontFamily: font(700), fontSize: t.font.small, color: filterNet >= 0 ? t.successStrong : t.dangerStrong }}>{money(filterNet, sym)}</Text>
              </View>
              <Pressable onPress={() => (selectMode ? exitSelect() : setSelectMode(true))} style={{ paddingHorizontal: 6 }}>
                <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: t.accent.text }}>{selectMode ? "Done" : "Select"}</Text>
              </Pressable>
            </View>

            {/* row 2: view toggle (left) + filter/sort (right) */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", backgroundColor: t.bg.muted, borderRadius: t.radius.md, borderWidth: 1, borderColor: t.border, overflow: "hidden" }}>
                <Pressable onPress={() => setView("cards")} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, backgroundColor: view === "cards" ? t.primary : "transparent" }}>
                  <LayoutList size={15} color={view === "cards" ? t.primaryText : t.text.secondary} />
                  <Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: view === "cards" ? t.primaryText : t.text.secondary }}>Cards</Text>
                </Pressable>
                <Pressable onPress={() => setView("grid")} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, height: 36, backgroundColor: view === "grid" ? t.primary : "transparent" }}>
                  <LayoutGrid size={15} color={view === "grid" ? t.primaryText : t.text.secondary} />
                  <Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: view === "grid" ? t.primaryText : t.text.secondary }}>Grid</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Pressable onPress={() => setSheet("filter")} style={{ width: 38, height: 38, borderRadius: t.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: activeFilters ? t.primarySubtle : t.bg.muted, borderWidth: 1, borderColor: activeFilters ? t.primary : t.border }}>
                  <SlidersHorizontal size={16} color={activeFilters ? t.accent.text : t.text.secondary} />
                  {activeFilters > 0 && (
                    <View style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: t.primaryText, fontFamily: font(700), fontSize: 9 }}>{activeFilters}</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={() => setSheet("sort")} style={{ width: 38, height: 38, borderRadius: t.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: t.bg.muted, borderWidth: 1, borderColor: t.border }}>
                  <ArrowDownUp size={16} color={t.text.secondary} />
                </Pressable>
              </View>
            </View>

            {/* bulk action bar */}
            {selectMode && selected.size > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.bg.muted, borderRadius: t.radius.md, padding: 10 }}>
                <Text style={{ flex: 1, fontFamily: font(700), fontSize: t.font.small, color: t.text.primary }}>{selected.size} selected</Text>
                <Pressable onPress={exportSelected} disabled={working} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: t.radius.sm, backgroundColor: t.bg.surface, borderWidth: 1, borderColor: t.border }}>
                  <Download size={14} color={t.text.secondary} /><Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: t.text.secondary }}>Export</Text>
                </Pressable>
                <Pressable onPress={deleteSelected} disabled={working} style={{ flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: t.radius.sm, backgroundColor: t.dangerSubtle }}>
                  <Trash2 size={14} color={t.dangerStrong} /><Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: t.dangerStrong }}>{working ? "…" : "Delete"}</Text>
                </Pressable>
              </View>
            )}

            {/* one collapsible box per date, with extra spacing between dates */}
            {filtered.length === 0 ? (
              <Card><View style={{ alignItems: "center", paddingVertical: t.space[5] }}><Muted>No trades in this range/filter.</Muted></View></Card>
            ) : (
              <View style={{ gap: t.space[5] }}>
                {groups.map((grp) => (
                  <DateGroup key={grp.label} t={t} grp={grp} sym={sym} view={view}
                    selectMode={selectMode} selected={selected}
                    onToggleSelect={toggleSelect}
                    onOpenTrade={(item) => navigation.navigate("TradeDetails", { trade: item })}
                    onImages={(item) => setImgTrade(item)} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* filter / sort bottom sheet */}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable onPress={() => setSheet(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: t.bg.elevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: t.space[5], paddingBottom: t.space[8], gap: t.space[4] }}>
            <View style={{ alignItems: "center", marginBottom: 2 }}>
              <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: t.border }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>{sheet === "sort" ? "Sort by" : "Filter"}</Text>
              <Pressable onPress={() => setSheet(null)} hitSlop={10}><X size={20} color={t.text.muted} /></Pressable>
            </View>

            {sheet === "sort" && (
              <View style={{ gap: 4 }}>
                {SORTS.map((o) => {
                  const active = sort === o.id;
                  return (
                    <Pressable key={o.id} onPress={() => { setSort(o.id); setSheet(null); }} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 12, borderRadius: t.radius.md, backgroundColor: active ? t.primarySubtle : "transparent" }}>
                      <Text style={{ fontFamily: font(active ? 700 : 500), fontSize: t.font.body, color: active ? t.accent.text : t.text.primary }}>{o.label}</Text>
                      {active && <Check size={18} color={t.accent.text} />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {sheet === "filter" && (
              <View style={{ gap: t.space[4] }}>
                <View style={{ gap: t.space[2] }}>
                  <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: t.text.secondary }}>Outcome</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <FChip t={t} active={filter === "all"} label="All" onPress={() => setFilter("all")} />
                    <FChip t={t} active={filter === "win"} label="Wins" onPress={() => setFilter("win")} />
                    <FChip t={t} active={filter === "loss"} label="Losses" onPress={() => setFilter("loss")} />
                  </View>
                </View>
                <View style={{ gap: t.space[2] }}>
                  <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: t.text.secondary }}>Direction</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <FChip t={t} active={direction === "all"} label="All" onPress={() => setDirection("all")} />
                    <FChip t={t} active={direction === "long"} label="Long" onPress={() => setDirection("long")} />
                    <FChip t={t} active={direction === "short"} label="Short" onPress={() => setDirection("short")} />
                  </View>
                </View>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
                  <Pressable onPress={() => { setFilter("all"); setDirection("all"); }} style={{ flex: 1, paddingVertical: 13, borderRadius: t.radius.md, alignItems: "center", backgroundColor: t.bg.muted, borderWidth: 1, borderColor: t.border }}>
                    <Text style={{ fontFamily: font(600), fontSize: t.font.body, color: t.text.secondary }}>Reset</Text>
                  </Pressable>
                  <Pressable onPress={() => setSheet(null)} style={{ flex: 1, paddingVertical: 13, borderRadius: t.radius.md, alignItems: "center", backgroundColor: t.primary }}>
                    <Text style={{ fontFamily: font(700), fontSize: t.font.body, color: t.primaryText }}>Show {filtered.length}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
