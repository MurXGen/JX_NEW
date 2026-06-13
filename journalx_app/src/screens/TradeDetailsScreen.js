import React, { useState } from "react";
import { Image, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, Copy, ImageIcon, LineChart, Pencil, Plus, Share2, ShieldAlert, Target, TrendingDown, TrendingUp, X, XCircle } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useApp } from "../context/AppContext";
import { AnimatedProgress } from "../components/charts";
import TvChart from "../components/TvChart";
import ImageModal from "../components/ImageModal";
import { money, currencySymbol, fmt } from "../lib/format";
import { font } from "../theme/typography";

let Clipboard = null;
try { Clipboard = require("expo-clipboard"); } catch {}

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
function abbr(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1250) return `${(n / 1e3).toFixed(1)}k`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function TradeDetailsScreen({ route, navigation }) {
  const { theme: t } = useTheme();
  const { currentAccount, refresh } = useApp();
  const trade = route.params?.trade || {};
  const sym = currencySymbol(currentAccount?.currency);

  const [images, setImages] = useState(imgUrls(trade));
  const [showImages, setShowImages] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [copied, setCopied] = useState(null);

  const pnl = Number(trade.pnl) || 0;
  const up = pnl >= 0;
  const isLong = (trade.direction || "").toLowerCase() === "long";
  const running = !trade.closeTime && trade.tradeStatus === "running";
  const symbol = trade.symbol || trade.ticker || "Trade";

  const entry = Number(trade.avgEntryPrice) || 0;
  const exit = Number(trade.avgExitPrice) || 0;
  const stop = Number(trade.avgSLPrice) || 0;
  const tp = Number(trade.avgTPPrice) || 0;
  const risk = entry && stop ? Math.abs(entry - stop) : 0;
  const reward = entry && exit ? Math.abs(exit - entry) : 0;
  const plannedReward = entry && tp ? Math.abs(tp - entry) : 0;
  const rr = risk && (plannedReward || reward) ? `1 : ${fmt((plannedReward || reward) / risk, 1)}` : trade.rr || "—";

  const notional = Number(trade.quantityUSD) || 0;
  const qty = Number(trade.totalQuantity) || 0;
  const asset = (symbol.split("/")[0] || "").trim();
  const retPct = trade.retPct != null ? Number(trade.retPct) : (notional ? (pnl / notional) * 100 : null);
  const rMult = trade.realizedR != null && Number.isFinite(Number(trade.realizedR)) ? Number(trade.realizedR) : null;
  const dur = durationStr(trade.openTime, trade.closeTime);
  const targetPct = plannedReward ? Math.max(0, Math.min(130, (reward / plannedReward) * 100)) : null;
  const hasJourney = !!(entry && stop && tp);
  const confidence = Number(trade.confidence) || 0;

  const closeDate = trade.closeTime || trade.openTime;
  const dateStr = closeDate ? new Date(closeDate).toLocaleString("en-US", { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " at") : null;
  const sourceLabel = trade.source === "auto" ? "Auto-imported" : trade.marketCondition || (isLong ? "Spot" : "Spot");
  const statusText = running ? "Running · Open" : up ? "Trade Closed · Win" : "Trade Closed · Loss";

  const heroBg = running ? t.bg.muted : up ? t.successSubtle : t.dangerSubtle;
  const accent = running ? t.text.secondary : up ? t.successStrong : t.dangerStrong;

  const brokerId = trade.orderId || trade.brokerOrderId || trade.exchangeOrderId || null;

  const copy = async (key, value) => {
    if (!value) return;
    try { if (Clipboard?.setStringAsync) await Clipboard.setStringAsync(String(value)); } catch {}
    setCopied(key);
    setTimeout(() => setCopied(null), 1400);
  };

  const onShare = async () => {
    const line = `${symbol} ${isLong ? "Long" : "Short"} · ${money(pnl, sym)}${retPct != null ? ` (${retPct >= 0 ? "+" : ""}${fmt(retPct, 1)}%)` : ""}`;
    try { await Share.share({ message: `My ${symbol} trade on JournalX — ${line}` }); } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg.canvas }}>
      <ImageModal visible={showImages} onClose={() => setShowImages(false)} tradeId={trade._id} trade={trade} initialImages={images} onChange={(next) => { setImages(next); refresh().catch(() => {}); }} />

      <ScrollView contentContainerStyle={{ paddingBottom: t.space[8] }} showsVerticalScrollIndicator={false}>
        {/* ===== hero (tinted by outcome) ===== */}
        <View style={{ backgroundColor: heroBg, paddingHorizontal: t.space[5], paddingTop: t.space[3], paddingBottom: t.space[6] }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: t.space[5] }}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.bg.surface, alignItems: "center", justifyContent: "center" }}>
              <X size={20} color={t.text.primary} />
            </Pressable>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable onPress={onShare} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.bg.surface, borderRadius: t.radius.md, paddingHorizontal: 14, paddingVertical: 8 }}>
                <Share2 size={15} color={t.text.primary} />
                <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.small }}>Share</Text>
              </Pressable>
              {trade._id ? (
                <Pressable onPress={() => navigation.navigate("LogTrade", { trade })} style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: t.bg.surface, borderRadius: t.radius.md, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Pencil size={15} color={t.text.primary} />
                  <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.small }}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ color: accent, fontFamily: font(800), fontSize: t.font.h1, letterSpacing: -1 }}>{money(pnl, sym)}</Text>
            {!running && (up
              ? <CheckCircle2 size={30} color="#fff" fill={t.successStrong} />
              : <XCircle size={30} color="#fff" fill={t.dangerStrong} />)}
          </View>
          <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: t.font.title, marginTop: 8 }}>{statusText}</Text>
          {dateStr ? <Text style={{ color: t.text.muted, fontFamily: font(500), fontSize: t.font.small, marginTop: 4 }}>{dateStr}</Text> : null}

          {retPct != null && (
            <View style={{ flexDirection: "row", alignSelf: "flex-start", alignItems: "center", gap: 6, marginTop: t.space[4], backgroundColor: t.bg.surface, borderRadius: t.radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
              <Target size={14} color={accent} />
              <Text style={{ color: accent, fontFamily: font(600), fontSize: t.font.small }}>
                {targetPct != null && targetPct >= 100 ? "Target hit · " : ""}{retPct >= 0 ? "+" : ""}{fmt(retPct, 1)}% return
              </Text>
            </View>
          )}
        </View>

        <View style={{ padding: t.space[5], gap: t.space[4] }}>
          {/* ===== instrument ===== */}
          <Panel t={t}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
              <View style={{ flex: 1 }}>
                <Label t={t}>INSTRUMENT</Label>
                <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: t.font.h3, marginTop: 4 }}>{symbol}</Text>
                <Text style={{ color: t.text.muted, fontFamily: font(500), fontSize: t.font.small, marginTop: 2 }}>{sourceLabel} · {isLong ? "Long" : "Short"}</Text>
              </View>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: t.primaryText, fontFamily: font(800), fontSize: t.font.bodyMd }}>{(asset || symbol).charAt(0).toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginTop: t.space[4] }}>
              {(trade.symbol || trade.ticker) ? (
                <Pressable onPress={() => setShowChart((v) => !v)} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: t.border, borderRadius: t.radius.md, paddingVertical: 11 }}>
                  <LineChart size={15} color={t.text.primary} />
                  <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.small }}>{showChart ? "Hide Chart" : "View Chart"}</Text>
                </Pressable>
              ) : null}
              {trade._id ? (
                <Pressable onPress={() => navigation.navigate("LogTrade", { trade })} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: t.border, borderRadius: t.radius.md, paddingVertical: 11 }}>
                  <Pencil size={15} color={t.text.primary} />
                  <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.small }}>Edit Trade</Text>
                </Pressable>
              ) : null}
            </View>
          </Panel>

          {showChart && (trade.symbol || trade.ticker) ? (
            <Panel t={t} noPad>
              <View style={{ padding: t.space[3] }}>
                <TvChart symbol={trade.symbol || trade.ticker} height={300} />
              </View>
            </Panel>
          ) : null}

          {/* ===== position ===== */}
          <Panel t={t}>
            <Label t={t}>POSITION</Label>
            <Text style={{ color: t.text.primary, fontFamily: font(800), fontSize: t.font.h3, marginTop: 4 }}>
              {isLong ? "Long" : "Short"}{qty ? ` · ${abbr(qty)} ${asset}` : ""}
            </Text>
            <Text style={{ color: t.text.secondary, fontFamily: font(500), fontSize: t.font.body, marginTop: 8 }}>
              Entry {entry ? `${sym}${abbr(entry)}` : "—"}  →  Exit {exit ? `${sym}${abbr(exit)}` : (running ? "Open" : "—")}
            </Text>
            <Text style={{ color: t.text.secondary, fontFamily: font(500), fontSize: t.font.body, marginTop: 4 }}>
              Net P&L <Text style={{ color: accent, fontFamily: font(700) }}>{money(pnl, sym)}</Text>
              {rr !== "—" ? <Text>  ·  R:R {rr}</Text> : null}
              {rMult != null ? <Text>  ·  {rMult >= 0 ? "+" : ""}{fmt(rMult, 1)}R</Text> : null}
            </Text>
          </Panel>

          {/* ===== risk / reward journey ===== */}
          {hasJourney && (
            <Panel t={t}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: t.space[3] }}>
                <Label t={t}>RISK / REWARD</Label>
                {targetPct != null && <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{fmt(Math.min(100, targetPct), 0)}% to target</Text>}
              </View>
              <JourneyBar t={t} isLong={isLong} entry={entry} stop={stop} tp={tp} exit={exit} up={up} />
              {targetPct != null && (
                <View style={{ marginTop: t.space[4], gap: 6 }}>
                  <AnimatedProgress pct={Math.min(100, targetPct)} color={targetPct >= 100 ? t.success : t.primary} height={8} />
                </View>
              )}
            </Panel>
          )}

          {/* ===== key levels ===== */}
          <Panel t={t}>
            <Label t={t} style={{ marginBottom: t.space[2] }}>KEY LEVELS</Label>
            <Row t={t} label="Entry" value={trade.avgEntryPrice} />
            <Row t={t} label="Exit" value={trade.avgExitPrice} />
            <Row t={t} label="Stop loss" value={trade.avgSLPrice} />
            <Row t={t} label="Take profit" value={trade.avgTPPrice} />
            <Row t={t} label="Size" value={notional ? `${sym}${abbr(notional)}` : null} />
            <Row t={t} label="Leverage" value={trade.leverage ? `${trade.leverage}x` : null} />
            <Row t={t} label="Fees" value={trade.feeAmount ? `${sym}${abbr(Number(trade.feeAmount))}` : null} />
            <Row t={t} label="Duration" value={dur} last />
          </Panel>

          {/* ===== screenshots ===== */}
          <Panel t={t}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: t.space[3] }}>
              <Label t={t}>SCREENSHOTS</Label>
              {images.length > 0 ? <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{images.length}</Text> : null}
            </View>
            {images.length === 0 ? (
              <Pressable onPress={() => setShowImages(true)} style={{ height: 150, borderRadius: t.radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.bg.canvas }}>
                <ImageIcon size={28} color={t.text.muted} />
                <Text style={{ color: t.text.muted, fontFamily: font(600), fontSize: t.font.small }}>Tap to add screenshots</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowImages(true)} style={{ borderRadius: t.radius.md, overflow: "hidden", borderWidth: 1, borderColor: t.border }}>
                <Image source={{ uri: images[0] }} style={{ width: "100%", height: 190 }} resizeMode="cover" />
                {images.length > 1 ? (
                  <View style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: t.radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: "#fff", fontFamily: font(600), fontSize: t.font.caption }}>+{images.length - 1} more</Text>
                  </View>
                ) : null}
              </Pressable>
            )}
          </Panel>

          {/* ===== psychology & process ===== */}
          {(trade.strategy || trade.emotion || trade.marketCondition || trade.timeframe || confidence || trade.rulesFollowed != null) && (
            <Panel t={t}>
              <Label t={t} style={{ marginBottom: t.space[2] }}>EDGE & PSYCHOLOGY</Label>
              <Row t={t} label="Strategy" value={trade.strategy} />
              <Row t={t} label="Market" value={trade.marketCondition} />
              <Row t={t} label="Timeframe" value={trade.timeframe} />
              <Row t={t} label="Emotion" value={trade.emotion} />
              {confidence > 0 && (
                <View style={{ marginTop: t.space[3], gap: 6 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>Confidence</Text>
                    <Text style={{ color: t.text.primary, fontFamily: font(600), fontSize: t.font.caption }}>{confidence}/5</Text>
                  </View>
                  <AnimatedProgress pct={(confidence / 5) * 100} color={t.primary} height={8} />
                </View>
              )}
              {trade.rulesFollowed != null && (
                <View style={{ marginTop: t.space[3], flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: t.text.muted, fontSize: t.font.body }}>Followed plan</Text>
                  <Text style={{ color: trade.rulesFollowed ? t.successStrong : t.dangerStrong, fontFamily: font(700), fontSize: t.font.body }}>{trade.rulesFollowed ? "Yes" : "No"}</Text>
                </View>
              )}
            </Panel>
          )}

          {/* ===== notes ===== */}
          {trade.learnings ? (
            <Panel t={t}>
              <Label t={t} style={{ marginBottom: t.space[2] }}>NOTES</Label>
              <Text style={{ color: t.text.secondary, fontSize: t.font.body, lineHeight: 21 }}>{trade.learnings}</Text>
            </Panel>
          ) : null}

          {/* ===== ids ===== */}
          {(trade._id || brokerId) && (
            <Panel t={t}>
              {trade._id ? <IdRow t={t} label="Trade ID" value={String(trade._id)} copied={copied === "trade"} onCopy={() => copy("trade", trade._id)} /> : null}
              {brokerId ? <IdRow t={t} label="Broker Order ID" value={String(brokerId)} copied={copied === "broker"} onCopy={() => copy("broker", brokerId)} last /> : null}
            </Panel>
          )}

          {/* ===== footer ===== */}
          <View style={{ alignItems: "center", paddingTop: t.space[3], gap: 3 }}>
            <Text style={{ color: t.text.muted, fontFamily: font(600), fontSize: 10, letterSpacing: 0.8 }}>POWERED BY</Text>
            <Text style={{ color: t.text.secondary, fontFamily: font(600), fontSize: t.font.small }}>
              JournalX{trade.source === "auto" ? " · Auto-imported" : ""}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* clean solid card */
function Panel({ t, children, noPad }) {
  return (
    <View style={{ backgroundColor: t.bg.surface, borderColor: t.border, borderWidth: 1, borderRadius: t.radius.lg, padding: noPad ? 0 : t.space[4] }}>
      {children}
    </View>
  );
}
function Label({ t, children, style }) {
  return <Text style={[{ color: t.text.muted, fontSize: 10, fontFamily: font(700), letterSpacing: 0.8 }, style]}>{children}</Text>;
}
function Row({ t, label, value, last }) {
  if (value == null || value === "" || value === 0) return null;
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, borderBottomColor: t.border, borderBottomWidth: last ? 0 : 1 }}>
      <Text style={{ color: t.text.muted, fontSize: t.font.body }}>{label}</Text>
      <Text style={{ color: t.text.primary, fontSize: t.font.body, fontFamily: font(600) }}>{String(value)}</Text>
    </View>
  );
}
function IdRow({ t, label, value, onCopy, copied, last }) {
  return (
    <View style={{ paddingVertical: 10, borderBottomColor: t.border, borderBottomWidth: last ? 0 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: t.text.muted, fontSize: t.font.caption }}>{label}</Text>
        <Pressable onPress={onCopy} hitSlop={8}><Copy size={16} color={copied ? t.successStrong : t.text.muted} /></Pressable>
      </View>
      <Text numberOfLines={1} style={{ color: t.text.primary, fontFamily: font(700), fontSize: t.font.bodyMd, marginTop: 3 }}>{copied ? "Copied!" : value}</Text>
    </View>
  );
}

/* SL → Entry → Exit → TP horizontal journey track */
function JourneyBar({ t, isLong, entry, stop, tp, exit, up }) {
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
        <View style={{ width: pct(entryPos), backgroundColor: t.dangerSubtle }} />
        <View style={{ flex: 1, backgroundColor: t.successSubtle }} />
      </View>
      <View style={{ position: "absolute", left: pct(entryPos), top: 18, width: 2, height: 18, backgroundColor: t.text.secondary }} />
      {exitPos != null && (
        <View style={{ position: "absolute", left: pct(exitPos), top: 13, transform: [{ translateX: -8 }] }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: up ? t.success : t.danger, borderWidth: 2, borderColor: t.bg.surface }} />
        </View>
      )}
      <View style={{ position: "absolute", left: 0, top: 0, flexDirection: "row", alignItems: "center", gap: 3 }}>
        <ShieldAlert size={11} color={t.dangerStrong} />
        <Text style={{ color: t.dangerStrong, fontSize: 9, fontFamily: font(700) }}>SL {fmt(stop, 2)}</Text>
      </View>
      <View style={{ position: "absolute", right: 0, top: 0, flexDirection: "row", alignItems: "center", gap: 3 }}>
        <Text style={{ color: t.successStrong, fontSize: 9, fontFamily: font(700) }}>TP {fmt(tp, 2)}</Text>
        <Target size={11} color={t.successStrong} />
      </View>
      <View style={{ position: "absolute", left: pct(entryPos), bottom: 0, transform: [{ translateX: -16 }] }}>
        <Text style={{ color: t.text.muted, fontSize: 9, fontFamily: font(600) }}>Entry {fmt(entry, 2)}</Text>
      </View>
    </View>
  );
}
