/* Trade screenshots modal — preview, add, and remove images for a trade.
   Works from the trades list and the details page. */
import React, { useState } from "react";
import { ActivityIndicator, Dimensions, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Plus, Trash2, Upload, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";
import { addTradeImage, removeTradeImage } from "../api/trades";
import { apiErrorMessage } from "../lib/error";

const { width: W } = Dimensions.get("window");

export default function ImageModal({ visible, onClose, tradeId, initialImages = [], onChange }) {
  const { theme } = useTheme();
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  // keep in sync when opened for a different trade
  React.useEffect(() => { if (visible) setImages(initialImages); }, [visible, tradeId]);

  const flashErr = (m) => { setErr(m); setTimeout(() => setErr(null), 3000); };

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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 48 }}>
          <Text style={{ color: "#fff", fontFamily: font(700), fontSize: theme.font.title }}>Screenshots</Text>
          <Pressable onPress={onClose} hitSlop={10}><X size={24} color="#fff" /></Pressable>
        </View>
        {err ? <Text style={{ color: theme.danger, textAlign: "center", marginBottom: 8 }}>{err}</Text> : null}
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {images.length === 0 && (
            <Text style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 24 }}>No screenshots yet. Add one below.</Text>
          )}
          {images.map((u, i) => (
            <View key={i} style={{ borderRadius: 14, overflow: "hidden", backgroundColor: "#111" }}>
              <Image source={{ uri: u }} style={{ width: W - 32, height: (W - 32) * 0.62 }} resizeMode="contain" />
              {tradeId ? (
                <Pressable onPress={() => remove(u)} disabled={busy} style={{ position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 8, flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <Trash2 size={15} color="#fff" />
                  <Text style={{ color: "#fff", fontFamily: font(600), fontSize: 12 }}>Remove</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </ScrollView>
        {tradeId ? (
          <View style={{ padding: 16, paddingBottom: 32 }}>
            <Pressable onPress={add} disabled={busy} style={{ backgroundColor: theme.primary, borderRadius: theme.radius.md, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, opacity: busy ? 0.7 : 1 }}>
              {busy ? <ActivityIndicator color={theme.primaryText} /> : <Upload size={16} color={theme.primaryText} />}
              <Text style={{ color: theme.primaryText, fontFamily: font(700) }}>{busy ? "Working…" : "Add screenshot"}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}
