import React, { useMemo, useState } from "react";
import { Alert, FlatList, Image, LayoutAnimation, Modal, Platform, Pressable, RefreshControl, ScrollView, Share, Text, UIManager, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotionView } from "../components/motion";
import { Activity, ArrowDownUp, BarChart3, CalendarDays, Check, CheckSquare, ChevronDown, ChevronRight, Clock, Download, FileDown, ImageIcon, LayoutGrid, List, ListChecks, Plus, SlidersHorizontal, Square, Trash2, TrendingDown, TrendingUp, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Muted, Badge, Button, Card, Grad, GlassBackdrop } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { CustomizeButton, useHiddenSections } from "../components/customize";
import Accordion from "../components/Accordion";
import PnlCalendar from "../components/PnlCalendar";
import Heatmap from "../components/Heatmap";
import ImageModal from "../components/ImageModal";
import { deleteTrade, importTradesBulk } from "../api/trades";
import { computeStats, filterByRange, RANGES } from "../lib/analytics";
import { csvToTrades, SAMPLE_HEADERS } from "../lib/csv";
import { getItem, setItem } from "../lib/storage";
import { font } from "../theme/typography";
import { money, currencySymbol, fmt } from "../lib/format";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const VIEW_KEY = "jx-trades-view";

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

const ABS_FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 };

/* tiny tag pill for strategy / timeframe / emotion */
function TagPill({ t, label }) {
  return (
    <View style={{ backgroundColor: t.glass.input, borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.pill, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text numberOfLines={1} style={{ color: t.text.secondary, fontFamily: font(500), fontSize: t.font.caption }}>{label}</Text>
    </View>
  );
}

/* small R-multiple / return badge tinted by sign */
function RPill({ t, rMult }) {
  const up = rMult >= 0;
  return (
    <View style={{ backgroundColor: up ? t.successSubtle : t.dangerSubtle, borderRadius: t.radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: up ? t.successStrong : t.dangerStrong, fontFamily: font(700), fontSize: t.font.caption }}>{`${up ? "+" : ""}${fmt(rMult, 1)}R`}</Text>
    </View>
  );
}

/* ===== Premium glass trade card (list view) — gradient P&L wash + left
   accent bar, symbol + direction pill, R badge, time/duration, tag pills. ===== */
function TradeRow({ t, trade, index, sym, onOpen, onImages, selectMode, selected, last }) {
  const pnl = Number(trade.pnl) || 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const up = pnl >= 0;
  const running = !trade.closeTime && trade.tradeStatus === "running";
  const thumb = firstImg(trade);
  const d = new Date(trade.closeTime || trade.openTime || NaN);
  const when = Number.isNaN(d.getTime())
    ? ""
    : `${d.toLocaleDateString("en-US", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  const dirLabel = running ? "Open" : isLong ? "Long" : "Short";
  const tag = running ? "Open" : up ? "Win" : "Loss";
  const tagColor = running ? t.text.secondary : up ? t.successStrong : t.dangerStrong;
  const tagBg = running ? t.bg.muted : up ? t.successSubtle : t.dangerSubtle;

  return (
    <MotionView delay={Math.min(index, 12) * 26}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          flexDirection: "row", alignItems: "center", gap: 12,
          paddingVertical: 12,
          borderBottomWidth: last ? 0 : 1, borderBottomColor: t.border,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {selectMode ? (selected ? <CheckSquare size={20} color={t.primary} /> : <Square size={20} color={t.text.muted} />) : null}
        {/* leading thumbnail — tap opens the screenshots sheet */}
        <Pressable onPress={selectMode ? onOpen : onImages} style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden", backgroundColor: t.bg.muted, alignItems: "center", justifyContent: "center" }}>
          {thumb ? <Image source={{ uri: thumb }} style={{ width: 46, height: 46 }} /> : <ImageIcon size={18} color={t.text.muted} />}
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>{trade.symbol || trade.ticker || "—"}</Text>
          <Text style={{ color: t.text.muted, fontSize: t.font.caption, marginTop: 3 }}>{when ? `${when} · ${dirLabel}` : dirLabel}</Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: up ? t.successStrong : t.dangerStrong, fontFamily: font(800), fontSize: t.font.bodyMd }}>{money(pnl, sym)}</Text>
            {up ? <TrendingUp size={14} color={t.successStrong} /> : <TrendingDown size={14} color={t.dangerStrong} />}
          </View>
          <View style={{ backgroundColor: tagBg, borderRadius: t.radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Text style={{ color: tagColor, fontFamily: font(700), fontSize: t.font.caption }}>{tag}</Text>
          </View>
        </View>
      </Pressable>
    </MotionView>
  );
}

/* ===== Compact 2-column stat card (grid view) — symbol, direction pill,
   prominent P&L, date/time. Flat grid, so the date lives on each card. ===== */
function GridCard({ t, trade, index, sym, onOpen, onImages, selectMode, selected }) {
  const pnl = Number(trade.pnl) || 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const up = pnl >= 0;
  const running = !trade.closeTime && trade.tradeStatus === "running";
  const isQuick = (trade.tradeStatus || "") === "quick";
  const thumb = firstImg(trade);
  const rMult = trade.realizedR != null && Number.isFinite(Number(trade.realizedR)) ? Number(trade.realizedR) : null;

  const d = new Date(trade.closeTime || trade.openTime || NaN);
  const dateStr = Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const timeStr = trade.closeTime ? new Date(trade.closeTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;

  const wash = running ? t.gradients.sheen : up ? t.gradients.statSuccess : t.gradients.statDanger;
  const accent = running ? [t.borderStrong, t.border] : up ? t.gradients.success : t.gradients.danger;

  return (
    <MotionView delay={Math.min(index, 12) * 30} style={{ flex: 1 }}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => ({
          flex: 1,
          borderRadius: t.radius.lg,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: selected ? t.primary : t.glass.border,
          backgroundColor: t.glass.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        })}
      >
        <Grad colors={wash} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={ABS_FILL} />
        <Grad colors={accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3 }} />

        <View style={{ padding: 12, paddingTop: 13, gap: 7 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Badge tone={isLong ? "success" : "danger"}>{isLong ? "LONG" : "SHORT"}</Badge>
            {selectMode ? (
              selected ? <CheckSquare size={19} color={t.primary} /> : <Square size={19} color={t.text.muted} />
            ) : thumb ? (
              <Pressable onPress={onImages} hitSlop={6} style={{ width: 28, height: 28, borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: t.glass.border }}>
                <Image source={{ uri: thumb }} style={{ width: 28, height: 28 }} />
              </Pressable>
            ) : (
              <ChevronRight size={15} color={t.text.muted} />
            )}
          </View>

          <Text numberOfLines={1} style={{ color: t.text.primary, fontFamily: font(800), fontSize: t.font.bodyMd }}>{trade.symbol || trade.ticker || "—"}</Text>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text numberOfLines={1} style={{ color: up ? t.successStrong : t.dangerStrong, fontFamily: font(800), fontSize: t.font.title }}>{money(pnl, sym)}</Text>
            {rMult != null && <RPill t={t} rMult={rMult} />}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <Text numberOfLines={1} style={{ flex: 1, color: t.text.muted, fontSize: t.font.caption }}>{dateStr}{timeStr ? ` · ${timeStr}` : ""}</Text>
            {running && <Badge tone="neutral">OPEN</Badge>}
            {isQuick && <Badge tone="warn">QUICK</Badge>}
          </View>
        </View>
      </Pressable>
    </MotionView>
  );
}

/* collapsible per-date box (list view) — trades render as glass cards */
function DateGroup({ t, grp, index, sym, selectMode, selected, onToggleSelect, onOpenTrade, onImages }) {
  const [open, setOpen] = useState(true);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpen((o) => !o);
  };
  return (
    <MotionView delay={Math.min(index, 8) * 45}>
      <Card style={{ padding: t.space[3] }}>
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
              <TradeRow key={item._id || `${grp.label}-${i}`} t={t} trade={item} index={i} sym={sym}
                last={i === grp.items.length - 1}
                selectMode={selectMode} selected={selected.has(item._id)}
                onOpen={() => (selectMode ? onToggleSelect(item._id) : onOpenTrade(item))}
                onImages={() => onImages(item)} />
            ))}
          </View>
        )}
      </Card>
    </MotionView>
  );
}

/* sheet selection chip — soft yellow tint when active (reference style) */
function SheetChip({ t, label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: t.radius.pill, backgroundColor: active ? t.primarySubtle : t.bg.surface, borderWidth: 1, borderColor: active ? t.accent.border : t.border }}>
      <Text style={{ fontFamily: font(active ? 700 : 600), fontSize: t.font.small, color: active ? t.accent.text : t.text.secondary }}>{label}</Text>
    </Pressable>
  );
}

/* outlined filter pill on the trades toolbar (Filter / Sort / Date) */
function FilterPill({ t, icon: Icon, label, onPress, active, caret }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: t.radius.pill, backgroundColor: active ? t.primarySubtle : t.bg.surface, borderWidth: 1, borderColor: active ? t.accent.border : t.border }}>
      {Icon && <Icon size={14} color={active ? t.accent.text : t.text.secondary} />}
      <Text style={{ fontFamily: font(600), fontSize: t.font.small, color: active ? t.accent.text : t.text.secondary }}>{label}</Text>
      {caret && <ChevronDown size={14} color={active ? t.accent.text : t.text.muted} />}
    </Pressable>
  );
}

/* single analytics summary card — 4 stats divided by hairlines (reference) */
function StatCard({ t, items }) {
  return (
    <Card style={{ paddingVertical: t.space[4], paddingHorizontal: t.space[2] }}>
      <View style={{ flexDirection: "row" }}>
        {items.map((it, i) => (
          <View key={it.label} style={{ flex: 1, alignItems: "center", paddingHorizontal: 4, borderLeftWidth: i === 0 ? 0 : 1, borderLeftColor: t.border }}>
            <Text style={{ color: t.text.muted, fontSize: 10, fontFamily: font(600), letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6, textAlign: "center" }}>{it.label}</Text>
            <Text numberOfLines={1} style={{ color: it.color || t.text.primary, fontFamily: font(800), fontSize: t.font.bodyMd }}>{it.value}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function KpiTile({ theme, label, value, color }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: "47%", borderColor: theme.glass.border, borderWidth: 1, borderRadius: theme.radius.lg, padding: theme.space[4], overflow: "hidden" }}>
      <Grad colors={theme.gradients.sheen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Text style={{ color: theme.text.muted, fontSize: theme.font.caption, marginBottom: 6, fontFamily: font(600), letterSpacing: 0.6, textTransform: "uppercase" }}>{label}</Text>
      <Text style={{ color: color || theme.text.primary, fontSize: theme.font.h3, fontFamily: font(700) }}>{value}</Text>
    </View>
  );
}

/* LIST / GRID segmented icon toggle */
function ViewToggle({ t, view, onChange }) {
  const opts = [
    { id: "cards", Icon: List, label: "List view" },
    { id: "grid", Icon: LayoutGrid, label: "Grid view" },
  ];
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.glass.input, borderRadius: t.radius.pill, borderWidth: 1, borderColor: t.glass.border, padding: 3, gap: 2 }}>
      {opts.map(({ id, Icon, label }) => {
        const active = view === id;
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onChange(id)}
            style={({ pressed }) => ({
              width: 40, height: 30, borderRadius: t.radius.pill, overflow: "hidden",
              alignItems: "center", justifyContent: "center",
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            {active && <Grad colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={ABS_FILL} />}
            <Icon size={15} color={active ? t.primaryText : t.text.secondary} />
          </Pressable>
        );
      })}
    </View>
  );
}

/* glass empty state — icon, copy, CTA */
function EmptyTrades({ t, hasAny, onLog, onClear }) {
  return (
    <MotionView>
      <Card style={{ alignItems: "center", paddingVertical: t.space[7], gap: 10 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: t.primarySubtle, borderWidth: 1, borderColor: t.accent.border, alignItems: "center", justifyContent: "center" }}>
          <BarChart3 size={26} color={t.accent.text} />
        </View>
        <Text style={{ fontFamily: font(700), fontSize: t.font.title, color: t.text.primary }}>
          {hasAny ? "No trades match" : "No trades yet"}
        </Text>
        <Muted style={{ fontSize: t.font.small, textAlign: "center", maxWidth: 260 }}>
          {hasAny ? "Try clearing your filters or widening the date range." : "Log your first trade and start building your edge."}
        </Muted>
        {hasAny ? (
          <Button title="Clear filters" variant="secondary" onPress={onClear} style={{ marginTop: 6, paddingVertical: 10 }} />
        ) : (
          <Button title="Log first trade" icon={Plus} onPress={onLog} style={{ marginTop: 6, paddingVertical: 10 }} />
        )}
      </Card>
    </MotionView>
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
  const [view, setView] = useState(() => (getItem(VIEW_KEY) === "grid" ? "grid" : "cards")); // cards | grid
  const [imgTrade, setImgTrade] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [working, setWorking] = useState(false);
  const [importing, setImporting] = useState(false);
  const { hidden, toggle, reset, isVisible } = useHiddenSections("jx-trades-hidden");

  const animateLayout = () =>
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
  const changeView = (v) => {
    if (v === view) return;
    animateLayout();
    setView(v);
    setItem(VIEW_KEY, v);
  };
  const setFilterAnim = (v) => { animateLayout(); setFilter(v); };
  const setDirectionAnim = (v) => { animateLayout(); setDirection(v); };
  const setSortAnim = (v) => { animateLayout(); setSort(v); };
  const setRangeAnim = (v) => { animateLayout(); setRange(v); };

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
  const monthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const rrVal = s.avgLoss > 0 ? s.avgWin / s.avgLoss : 0;
  const rrLabel = rrVal > 0 ? `1 : ${fmt(rrVal, 1)}` : "—";
  const dateActive = range !== "ALL";

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
    <View style={{ flexDirection: "row", backgroundColor: t.glass.input, borderWidth: 1, borderColor: t.glass.border, borderRadius: t.radius.pill, padding: 3 }}>
      {RANGES.map((r) => {
        const active = r === range;
        return (
          <Pressable key={r} onPress={() => setRangeAnim(r)} style={{ flex: 1, paddingVertical: 7, borderRadius: t.radius.pill, overflow: "hidden", alignItems: "center" }}>
            {active && <Grad colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />}
            <Text style={{ color: active ? t.primaryText : t.text.muted, fontFamily: font(active ? 700 : 500), fontSize: t.font.small }}>{r}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const showTrades = isVisible("trades");
  const isGrid = view === "grid";

  /* grid data padded to an even count so the last card doesn't stretch */
  const gridData = useMemo(
    () => (filtered.length % 2 ? [...filtered, { __empty: true }] : filtered),
    [filtered]
  );
  const listData = showTrades ? (isGrid ? gridData : groups) : [];

  const header = (
    <View style={{ gap: t.space[4] }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontFamily: font(800), fontSize: t.font.h1, color: t.text.primary, letterSpacing: -0.5 }}>Trades</Text>
          <Text style={{ fontFamily: font(500), fontSize: t.font.small, color: t.text.muted, marginTop: 2 }}>{s.n} {s.n === 1 ? "trade" : "trades"} · {monthLabel}</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <CustomizeButton sections={SECTIONS} hidden={hidden} onToggle={toggle} onReset={reset} />
          <Pressable onPress={importCsv} disabled={importing} style={{ width: 38, height: 38, borderRadius: t.radius.md, alignItems: "center", justifyContent: "center", backgroundColor: t.bg.muted, borderWidth: 1, borderColor: t.border, opacity: importing ? 0.6 : 1 }}>
            <FileDown size={16} color={t.text.secondary} />
          </Pressable>
        </View>
      </View>

      <JournalSwitcher />

      {isVisible("performance") && (
        <StatCard
          t={t}
          items={[
            { label: "Net P&L", value: money(s.net, sym), color: s.net >= 0 ? t.successStrong : t.dangerStrong },
            { label: "Win rate", value: `${s.winRate}%` },
            { label: "Trades", value: `${s.n}` },
            { label: "Avg R:R", value: rrLabel },
          ]}
        />
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

      {showTrades && (
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

          {/* filter pills — Filter / Sort / Date, all open the filter sheet */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FilterPill t={t} icon={SlidersHorizontal} label={activeFilters ? `Filter · ${activeFilters}` : "Filter"} active={activeFilters > 0} onPress={() => setSheet("filter")} />
            <FilterPill t={t} icon={ArrowDownUp} label="Sort" caret active={sort !== "newest"} onPress={() => setSheet("filter")} />
            <FilterPill t={t} icon={CalendarDays} label="Date" active={dateActive} onPress={() => setSheet("filter")} />
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
        </View>
      )}
    </View>
  );

  const openTrade = (item) => navigation.navigate("TradeDetails", { trade: item });

  const renderItem = ({ item, index }) => {
    if (isGrid) {
      if (item.__empty) return <View style={{ flex: 1 }} />;
      return (
        <GridCard t={t} trade={item} index={index} sym={sym}
          selectMode={selectMode} selected={selected.has(item._id)}
          onOpen={() => (selectMode ? toggleSelect(item._id) : openTrade(item))}
          onImages={() => setImgTrade(item)} />
      );
    }
    return (
      <View style={{ marginBottom: t.space[4] }}>
        <DateGroup t={t} grp={item} index={index} sym={sym}
          selectMode={selectMode} selected={selected}
          onToggleSelect={toggleSelect}
          onOpenTrade={openTrade}
          onImages={(tr) => setImgTrade(tr)} />
      </View>
    );
  };

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
      <ImageModal visible={!!imgTrade} onClose={() => setImgTrade(null)} tradeId={imgTrade?._id} trade={imgTrade} initialImages={imgTrade ? imgUrls(imgTrade) : []} onChange={() => refresh().catch(() => {})} />

      {/* key-switched FlatList: 1-col grouped cards ↔ 2-col compact grid */}
      <FlatList
        key={view}
        data={listData}
        keyExtractor={(item, i) => (isGrid ? (item.__empty ? "__empty" : item._id || `tr-${i}`) : item.label)}
        renderItem={renderItem}
        numColumns={isGrid ? 2 : 1}
        columnWrapperStyle={isGrid ? { gap: t.space[3], marginBottom: t.space[3] } : undefined}
        ListHeaderComponent={header}
        ListHeaderComponentStyle={{ marginBottom: showTrades ? t.space[3] : 0 }}
        ListEmptyComponent={showTrades ? (
          <EmptyTrades t={t} hasAny={trades.length > 0}
            onLog={() => navigation.navigate("LogTrade")}
            onClear={() => { animateLayout(); setFilter("all"); setDirection("all"); setRange("ALL"); }} />
        ) : null}
        contentContainerStyle={{ padding: t.space[5], paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.text.muted} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Filters bottom sheet (Direction / Outcome / Sort / Date range) */}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable onPress={() => setSheet(null)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: t.bg.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: t.border, maxHeight: "86%" }}>
            <View style={{ alignItems: "center", paddingTop: 10 }}>
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: t.space[5], paddingTop: t.space[3] }}>
              <Text style={{ fontFamily: font(800), fontSize: t.font.h3, color: t.text.primary }}>Filters</Text>
              <Pressable onPress={() => { animateLayout(); setFilter("all"); setDirection("all"); setSort("newest"); setRange("ALL"); }} hitSlop={8}>
                <Text style={{ fontFamily: font(600), fontSize: t.font.body, color: t.accent.text }}>Reset</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: t.space[5], paddingTop: t.space[4], paddingBottom: t.space[4], gap: t.space[5] }} keyboardShouldPersistTaps="handled">
              <View style={{ gap: t.space[3] }}>
                <Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: t.text.muted, letterSpacing: 0.6 }}>DIRECTION</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <SheetChip t={t} label="Long" active={direction === "long"} onPress={() => setDirectionAnim(direction === "long" ? "all" : "long")} />
                  <SheetChip t={t} label="Short" active={direction === "short"} onPress={() => setDirectionAnim(direction === "short" ? "all" : "short")} />
                </View>
              </View>

              <View style={{ gap: t.space[3] }}>
                <Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: t.text.muted, letterSpacing: 0.6 }}>OUTCOME</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <SheetChip t={t} label="Win" active={filter === "win"} onPress={() => setFilterAnim(filter === "win" ? "all" : "win")} />
                  <SheetChip t={t} label="Loss" active={filter === "loss"} onPress={() => setFilterAnim(filter === "loss" ? "all" : "loss")} />
                </View>
              </View>

              <View style={{ gap: t.space[3] }}>
                <Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: t.text.muted, letterSpacing: 0.6 }}>SORT BY</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[["newest", "Newest"], ["oldest", "Oldest"], ["pnl-high", "Highest P&L"], ["pnl-low", "Lowest P&L"]].map(([id, label]) => (
                    <SheetChip key={id} t={t} label={label} active={sort === id} onPress={() => setSortAnim(id)} />
                  ))}
                </View>
              </View>

              <View style={{ gap: t.space[3] }}>
                <Text style={{ fontFamily: font(700), fontSize: t.font.caption, color: t.text.muted, letterSpacing: 0.6 }}>DATE RANGE</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {[["1D", "Today"], ["1W", "This week"], ["1M", "This month"], ["ALL", "All time"]].map(([id, label]) => (
                    <SheetChip key={id} t={t} label={label} active={range === id} onPress={() => setRangeAnim(id)} />
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={{ padding: t.space[5], paddingTop: t.space[3], borderTopWidth: 1, borderTopColor: t.border }}>
              <Pressable onPress={() => setSheet(null)} style={{ backgroundColor: t.primary, borderRadius: t.radius.md, paddingVertical: 16, alignItems: "center" }}>
                <Text style={{ color: t.primaryText, fontFamily: font(800), fontSize: t.font.bodyMd }}>Apply Filters</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
    </GradientBackground>
  );
}
