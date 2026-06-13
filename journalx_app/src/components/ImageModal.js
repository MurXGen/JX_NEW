/* Trade screenshots — a clean bottom sheet to view, add and remove a trade's
   screenshots (mirrors the reference). Tapping a thumbnail opens a full-screen
   zoom preview. */
import React, { useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { ImageIcon, Plus, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";
import { addTradeImage, removeTradeImage } from "../api/trades";
import { apiErrorMessage } from "../lib/error";

const { width: W } = Dimensions.get("window");

export default function ImageModal({ visible, onClose, tradeId, trade, initialImages = [], onChange }) {
  const { theme: t } = useTheme();
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [preview, setPreview] = useState(null); // url being zoomed

  React.useEffect(() => { if (visible) setImages(initialImages); }, [visible, tradeId]);

  const flashErr = (m) => { setErr(m); setTimeout(() => setErr(null), 3000); };

  const subtitle = (() => {
    if (!trade) return null;
    const sym = trade.symbol || trade.ticker;
    const d = new Date(trade.closeTime || trade.openTime || NaN);
    const when = Number.isNaN(d.getTime()) ? "" : `${d.toLocaleDateString("en-US", { day: "numeric", month: "short" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    return [sym, when].filter(Boolean).join(" · ");
  })();

  const add = async () => {
    if (!tradeId) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return flashErr("Allow photo access to add an image");
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
      if (res.canceled) return;
      const a = res.assets?.[0];
      if (!a) return;
      setBusy(true);
      const data = await addTradeImage(tradeId, { uri: a.uri, name: a.fileName, type: a.mimeType });
      const next = (data?.images || []).map((im) => im.url || im);
      setImages(next);
      onChange?.(next);
    } catch (e) {
      flashErr(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (url) => {
    if (!tradeId) return;
    try {
      setBusy(true);
      const data = await removeTradeImage(tradeId, url);
      const next = (data?.images || []).map((im) => im.url || im);
      setImages(next);
      onChange?.(next);
    } catch (e) {
      flashErr(apiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const TILE = 104;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: t.bg.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: t.border, paddingBottom: t.space[8] }}>
          <View style={{ alignItems: "center", paddingTop: 10 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: t.border }} />
          </View>

          {/* header */}
          <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingHorizontal: t.space[5], paddingTop: t.space[3] }}>
            <View>
              <Text style={{ fontFamily: font(800), fontSize: t.font.h3, color: t.text.primary }}>Screenshots</Text>
              {subtitle ? <Text style={{ fontFamily: font(500), fontSize: t.font.small, color: t.text.muted, marginTop: 2 }}>{subtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: t.bg.muted, alignItems: "center", justifyContent: "center" }}>
              <X size={18} color={t.text.muted} />
            </Pressable>
          </View>

          {err ? <Text style={{ color: t.dangerStrong, paddingHorizontal: t.space[5], marginTop: 8, fontSize: t.font.small }}>{err}</Text> : null}

          {/* thumbnails + add tile */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: t.space[5], paddingVertical: t.space[5], gap: 12 }}>
            {images.map((u, i) => (
              <Pressable key={i} onPress={() => setPreview(u)} style={{ width: TILE, height: TILE, borderRadius: t.radius.md, overflow: "hidden", backgroundColor: t.bg.muted, borderWidth: 1, borderColor: t.border }}>
                <Image source={{ uri: u }} style={{ width: TILE, height: TILE }} resizeMode="cover" />
                {tradeId ? (
                  <Pressable onPress={() => remove(u)} disabled={busy} hitSlop={6} style={{ position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" }}>
                    <X size={14} color="#fff" />
                  </Pressable>
                ) : null}
              </Pressable>
            ))}

            {tradeId ? (
              <Pressable onPress={add} disabled={busy} style={{ width: TILE, height: TILE, borderRadius: t.radius.md, borderWidth: 1.5, borderStyle: "dashed", borderColor: t.borderStrong, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: t.bg.canvas }}>
                {busy ? <ActivityIndicator color={t.text.muted} /> : <Plus size={22} color={t.accent.text} />}
                <Text style={{ fontFamily: font(600), fontSize: t.font.caption, color: t.text.secondary }}>{busy ? "…" : "Add"}</Text>
              </Pressable>
            ) : images.length === 0 ? (
              <View style={{ width: TILE * 2, height: TILE, borderRadius: t.radius.md, alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: t.bg.muted }}>
                <ImageIcon size={22} color={t.text.muted} />
                <Text style={{ fontFamily: font(500), fontSize: t.font.caption, color: t.text.muted }}>No screenshots</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* done */}
          <View style={{ paddingHorizontal: t.space[5] }}>
            <Pressable onPress={onClose} style={{ backgroundColor: t.primary, borderRadius: t.radius.md, paddingVertical: 15, alignItems: "center" }}>
              <Text style={{ color: t.primaryText, fontFamily: font(800), fontSize: t.font.bodyMd }}>Done</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>

      {/* full-screen zoom preview */}
      {preview ? (
        <Pressable onPress={() => setPreview(null)} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.94)", alignItems: "center", justifyContent: "center" }}>
          <Pressable onPress={() => setPreview(null)} hitSlop={10} style={{ position: "absolute", top: 48, right: 18, width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" }}>
            <X size={22} color="#fff" />
          </Pressable>
          <Image source={{ uri: preview }} style={{ width: W, height: W }} resizeMode="contain" />
        </Pressable>
      ) : null}
    </Modal>
  );
}
