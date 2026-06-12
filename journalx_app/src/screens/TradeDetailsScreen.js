import React, { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ImageIcon, Pencil, Plus, X, Target, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { Badge, Grad, GlassBackdrop } from "../components/ui";
import GradientBackground from "../components/GradientBackground";
import { AnimatedProgress } from "../components/charts";
import TvChart from "../components/TvChart";
import ImageModal from "../components/ImageModal";
import { money, currencySymbol, fmt } from "../lib/format";
import { font } from "../theme/typography";

function imgUrls(trade) {
  const out = [];
  (trade.images || []).forEach((im) => { const u = im?.url || im; if (u) out.push(u); });
  if (trade.openImageUrl) out.push(trade.openImageUrl);
  if (trade.closeImageUrl) out.push(trade.closeImageUrl);
  return out;
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

export default function TradeDetailsScreen({ route, navigation }) {
  const { theme } = useTheme();
  const t = theme;
  const { currentAccount, refresh } = useApp();
  const trade = route.params?.trade || {};
  const sym = currencySymbol(currentAccount?.currency);

  const [images, setImages] = useState(imgUrls(trade));
  const [showImages, setShowImages] = useState(false);

  const pnl = Number(trade.pnl) || 0;
  const up = pnl >= 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const running = !trade.closeTime && trade.tradeStatus === "running";
  const dt = (v) => (v ? new Date(v).toLocaleString() : null);

  const entry = Number(trade.avgEntryPrice) || 0;
  const exit = Number(trade.avgExitPrice) || 0;
  const stop = Number(trade.avgSLPrice) || 0;
  const tp = Number(trade.avgTPPrice) || 0;
  const risk = entry && stop ? Math.abs(entry - stop) : 0;
  const reward = entry && exit ? Math.abs(exit - entry) : 0;
  const plannedReward = entry && tp ? Math.abs(tp - entry) : 0;
  const rr = risk && (plannedReward || reward) ? `1 : ${fmt((plannedReward || reward) / risk, 2)}` : trade.rr || null;

  const notional = Number(trade.quantityUSD) || 0;
  const retPct = trade.retPct != null ? Number(trade.retPct) : (notional ? (pnl / notional) * 100 : null);
  const rMult = trade.realizedR != null && Number.isFinite(Number(trade.realizedR)) ? Number(trade.realizedR) : (risk && reward ? (reward / risk) * (up ? 1 : -1) : null);
  const dur = durationStr(trade.openTime, trade.closeTime);

  // % of the planned target captured by the realised exit (the "how far did it
  // run toward target" progress — like the web 'if you had held' view)
  const targetPct = plannedReward ? Math.max(0, Math.min(130, (reward / plannedReward) * 100)) : null;
  const hasJourney = !!(entry && stop && tp);

  // confidence (0-5) → %
  const confidence = Number(trade.confidence) || 0;

  return (
    <GradientBackground>
    <SafeAreaView style={{ flex: 1 }}>
      <ImageModal
        visible={showImages}
        onClose={() => setShowImages(false)}
        tradeId={trade._id}
        initialImages={images}
        onChange={(next) => { setImages(next); refresh().catch(() => {}); }}
      />

      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: t.space[5], paddingVertical: t.space[4], borderBottomColor: t.glass.border, borderBottomWidth: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontFamily: font(800), fontSize: t.font.h2, color: t.text.primary }}>{trade.symbol || trade.ticker || "Trade"}</Text>
          <Badge tone={isLong ? "success" : "danger"}>{isLong ? "LONG" : "SHORT"}</Badge>
          <Badge tone={running ? "warn" : "neutral"}>{running ? "OPEN" : trade.tradeStatus || "trade"}</Badge>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {trade._id ? (
            <Pressable onPress={() => navigation.navigate("LogTrade", { trade })} style={{ flexDirection: "row", alignItems: "center", gap: 6, borderRadius: t.radius.md, paddingHorizontal: 12, paddingVertical: 8, overflow: "hidden", shadowColor: t.primary, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5 }}>
              <Grad colors={t.gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
              <Pencil size={14} color={t.primaryText} />
              <Text style={{ color: t.primaryText, fontFamily: font(700), fontSize: t.font.small }}>Edit</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => navigation.goBack()} hitSlop={10}><X size={24} color={t.text.muted} /></Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: t.space[5], gap: t.space[4], paddingBottom: t.space[8] }}>
        {/* ===== P&L hero ===== */}
        <View style={{ alignItems: "center", gap: 6, paddingVertical: t.space[3] }}>
          <Text style={{ color: t.text.muted, fontSize: t.font.caption, fontFamily: font(600), letterSpacing: 0.5, textTransform: "uppercase" }}>Net P&L</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {up ? <TrendingUp size={24} color={t.success} /> : <TrendingDown size={24} color={t.danger} />}
            <Text style={{ color: up ? t.successStrong : t.dangerStrong, fontSize: t.font.h1, fontFamily: font(800) }}>{money(pnl, sym)}</Text>
          </View>
          {(retPct != null || rMult != null) && (
            <Text style={{ color: t.text.secondary, fontSize: t.font.small, fontFamily: font(600) }}>
              {retPct != null ? `${retPct >= 0 ? "+" : ""}${fmt(retPct, 2)}% return` : ""}
              {retPct != null && rMult != null ? "  ·  " : ""}
              {rMult != null ? `${rMult >= 0 ? "+" : ""}${fmt(rMult, 2)}R` : ""}
            </Text>
          )}
        </View>

        {/* ===== bento stat grid ===== */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[2] }}>
          <Tile t={t} label="Entry" value={entry ? fmt(entry, 4) : "—"} />
          <Tile t={t} label="Exit" value={exit ? fmt(exit, 4) : (running ? "Open" : "—")} />
          <Tile t={t} label="Size" value={notional ? `${sym}${abbr(notional)}` : "—"} />
          <Tile t={t} label="Return" value={retPct != null ? `${fmt(retPct, 1)}%` : "—"} color={retPct >= 0 ? t.successStrong : t.dangerStrong} />
          <Tile t={t} label="R : R" value={rr || "—"} />
          <Tile t={t} label="Fees" value={trade.feeAmount ? `${sym}${abbr(Number(trade.feeAmount))}` : "—"} />
          <Tile t={t} label="Leverage" value={trade.leverage ? `${trade.leverage}x` : "—"} />
          <Tile t={t} label="Duration" value={dur || "—"} />
        </View>

        {/* ===== risk/reward journey (SL → Entry → Exit → TP) ===== */}
        {hasJourney && (
          <Panel t={t}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: t.space[3] }}>
              <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>Risk / reward journey</Text>
              {targetPct != null && (
                <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>
                  {fmt(targetPct, 0)}% to target
                </Text>
              )}
            </View>
            <JourneyBar t={t} isLong={isLong} entry={entry} stop={stop} tp={tp} exit={exit} up={up} />
            {targetPct != null && (
              <View style={{ marginTop: t.space[4], gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Target captured</Text>
                  <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.caption }}>{fmt(Math.min(100, targetPct), 0)}%</Text>
                </View>
                <AnimatedProgress pct={Math.min(100, targetPct)} color={targetPct >= 100 ? t.success : t.primary} height={8} />
              </View>
            )}
          </Panel>
        )}

        {/* ===== screenshots (big) — app only: tap to view/add ===== */}
        <Panel t={t}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: t.space[3] }}>
            <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>Screenshots</Text>
            {images.length > 0 && <Badge tone="neutral">{images.length}/4</Badge>}
          </View>
          {images.length === 0 ? (
            <Pressable onPress={() => setShowImages(true)} style={{ height: 168, borderRadius: t.radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.bg.canvas }}>
              <ImageIcon size={30} color={t.text.muted} />
              <Text style={{ color: t.text.muted, fontFamily: font(600), fontSize: t.font.small }}>Tap to add screenshots</Text>
            </Pressable>
          ) : (
            <>
              <Pressable onPress={() => setShowImages(true)} style={{ borderRadius: t.radius.md, overflow: "hidden", borderWidth: 1, borderColor: t.border }}>
                <Image source={{ uri: images[0] }} style={{ width: "100%", height: 200 }} resizeMode="cover" />
              </Pressable>
              {(images.length > 1 || trade._id) && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {images.slice(1).map((u, i) => (
                    <Pressable key={i} onPress={() => setShowImages(true)}>
                      <Image source={{ uri: u }} style={{ width: 80, height: 64, borderRadius: t.radius.sm, borderWidth: 1, borderColor: t.border }} />
                    </Pressable>
                  ))}
                  {trade._id && (
                    <Pressable onPress={() => setShowImages(true)} style={{ width: 80, height: 64, borderRadius: t.radius.sm, borderWidth: 1, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 3 }}>
                      <Plus size={16} color={t.text.muted} />
                      <Text style={{ fontSize: 9, color: t.text.muted }}>Manage</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </>
          )}
        </Panel>

        {/* ===== chart ===== */}
        {(trade.symbol || trade.ticker) ? (
          <Panel t={t} noPad>
            <View style={{ padding: t.space[4], paddingBottom: 0 }}>
              <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd }}>Live chart</Text>
            </View>
            <View style={{ padding: t.space[3] }}>
              <TvChart symbol={trade.symbol || trade.ticker} height={300} />
            </View>
          </Panel>
        ) : null}

        {/* ===== key levels ===== */}
        <Panel t={t}>
          <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd, marginBottom: t.space[2] }}>Key levels</Text>
          <Row t={t} label="Entry" value={trade.avgEntryPrice} />
          <Row t={t} label="Exit" value={trade.avgExitPrice} />
          <Row t={t} label="Stop loss" value={trade.avgSLPrice} />
          <Row t={t} label="Take profit" value={trade.avgTPPrice} />
          <Row t={t} label="Quantity" value={trade.totalQuantity} last />
        </Panel>

        {/* ===== edge & psychology (bento) ===== */}
        {(trade.strategy || trade.emotion || trade.marketCondition || trade.timeframe || confidence || trade.rulesFollowed != null) && (
          <Panel t={t}>
            <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd, marginBottom: t.space[3] }}>Edge & psychology</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: t.space[2] }}>
              {trade.strategy ? <Tile t={t} label="Strategy" value={trade.strategy} wide /> : null}
              {trade.marketCondition ? <Tile t={t} label="Market" value={trade.marketCondition} /> : null}
              {trade.timeframe ? <Tile t={t} label="Timeframe" value={trade.timeframe} /> : null}
              {trade.emotion ? <Tile t={t} label="Emotion" value={trade.emotion} /> : null}
            </View>
            {confidence > 0 && (
              <View style={{ marginTop: t.space[4], gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Confidence</Text>
                  <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.caption }}>{confidence}/5</Text>
                </View>
                <AnimatedProgress pct={(confidence / 5) * 100} color={t.primary} height={8} delay={120} />
              </View>
            )}
            {trade.rulesFollowed != null && (
              <View style={{ marginTop: t.space[4], gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Plan followed</Text>
                  <Text style={{ color: trade.rulesFollowed ? t.successStrong : t.dangerStrong, fontFamily: font(600), fontSize: t.font.caption }}>{trade.rulesFollowed ? "Yes" : "No"}</Text>
                </View>
                <AnimatedProgress pct={trade.rulesFollowed ? 100 : 18} color={trade.rulesFollowed ? t.success : t.danger} height={8} delay={220} />
              </View>
            )}
          </Panel>
        )}

        {/* ===== notes ===== */}
        {trade.learnings ? (
          <Panel t={t}>
            <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd, marginBottom: t.space[2] }}>Notes</Text>
            <Text style={{ color: t.text.secondary, fontSize: t.font.body, lineHeight: 21 }}>{trade.learnings}</Text>
          </Panel>
        ) : null}

        {/* ===== timing ===== */}
        <Panel t={t}>
          <Text style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd, marginBottom: t.space[2] }}>Timing</Text>
          <Row t={t} label="Opened" value={dt(trade.openTime)} />
          <Row t={t} label="Closed" value={dt(trade.closeTime)} />
          <Row t={t} label="Source" value={trade.source} last />
        </Panel>
      </ScrollView>
    </SafeAreaView>
    </GradientBackground>
  );
}

function abbr(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1250) return `${(n / 1e3).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/* card panel — frosted glass */
function Panel({ t, children, noPad }) {
  return (
    <View style={{ borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.xl, padding: noPad ? 0 : t.space[4], overflow: "hidden" }}>
      <GlassBackdrop />
      <Grad colors={[t.glass.highlight, "rgba(255,255,255,0)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5 }} />
      {children}
    </View>
  );
}

/* bento stat tile — soft gradient wash */
function Tile({ t, label, value, color, wide }) {
  return (
    <View style={{ flexGrow: 1, flexBasis: wide ? "100%" : "30%", minWidth: wide ? "100%" : 96, borderColor: t.glass.border, borderWidth: 1, borderRadius: t.radius.md, paddingVertical: 10, paddingHorizontal: 12, overflow: "hidden" }}>
      <GlassBackdrop />
      <Grad colors={t.gradients.sheen} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Text style={{ color: t.text.muted, fontSize: t.font.caption, marginBottom: 3, fontFamily: font(600), letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</Text>
      <Text numberOfLines={1} style={{ color: color || t.text.primary, fontSize: t.font.bodyMd, fontFamily: font(700) }}>{String(value)}</Text>
    </View>
  );
}

/* SL → Entry → Exit → TP horizontal journey track */
function JourneyBar({ t, isLong, entry, stop, tp, exit, up }) {
  // map a price to 0..1 along the loss(left) → profit(right) axis
  const span = isLong ? tp - stop : stop - tp;
  const posOf = (p) => {
    if (!span) return 0;
    const v = isLong ? (p - stop) / span : (stop - p) / span;
    return Math.max(0, Math.min(1, v));
  };
  const entryPos = posOf(entry);
  const exitPos = exit ? posOf(exit) : null;
  const pct = (x) => `${x * 100}%`;

  return (
    <View style={{ paddingTop: 22, paddingBottom: 26 }}>
      <View style={{ height: 10, borderRadius: 6, overflow: "hidden", flexDirection: "row", backgroundColor: t.bg.muted }}>
        {/* loss zone (SL→entry) red tint, profit zone (entry→TP) green tint */}
        <View style={{ width: pct(entryPos), backgroundColor: t.dangerSubtle }} />
        <View style={{ flex: 1, backgroundColor: t.successSubtle }} />
      </View>

      {/* entry tick */}
      <View style={{ position: "absolute", left: pct(entryPos), top: 18, width: 2, height: 18, backgroundColor: t.text.secondary }} />
      {/* exit marker dot */}
      {exitPos != null && (
        <View style={{ position: "absolute", left: pct(exitPos), top: 13, transform: [{ translateX: -8 }] }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: up ? t.success : t.danger, borderWidth: 2, borderColor: t.bg.surface }} />
        </View>
      )}

      {/* labels: SL (left), TP (right), Entry (under tick), Exit (over dot) */}
      <View style={{ position: "absolute", left: 0, top: 0, flexDirection: "row", alignItems: "center", gap: 3 }}>
        <ShieldAlert size={11} color={t.dangerStrong} />
        <Text style={{ color: t.dangerStrong, fontSize: 9, fontFamily: font(700) }}>SL {fmt(stop, 4)}</Text>
      </View>
      <View style={{ position: "absolute", right: 0, top: 0, flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Text style={{ color: t.successStrong, fontSize: 9, fontFamily: font(700) }}>TP {fmt(tp, 4)}</Text>
        <Target size={11} color={t.successStrong} />
      </View>
      <View style={{ position: "absolute", left: pct(entryPos), bottom: 0, transform: [{ translateX: -16 }] }}>
        <Text style={{ color: t.text.muted, fontSize: 9, fontFamily: font(600) }}>Entry {fmt(entry, 2)}</Text>
      </View>
    </View>
  );
}

function Row({ t, label, value, strong, last }) {
  if (value == null || value === "" || value === 0) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomColor: t.border, borderBottomWidth: last ? 0 : 1 }}>
      <Text style={{ color: t.text.muted, fontSize: t.font.body }}>{label}</Text>
      <Text style={{ color: t.text.primary, fontSize: t.font.body, fontFamily: font(strong ? 700 : 600) }}>{String(value)}</Text>
    </View>
  );
}
