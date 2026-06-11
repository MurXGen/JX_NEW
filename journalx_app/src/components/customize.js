/* Show/hide dashboard sections — the mobile version of the web "Customize"
   control. Persists hidden ids in MMKV; renders a button + a bottom sheet of
   toggles. */
import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { SlidersHorizontal, Check, X } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { getItem, setItem } from "../lib/storage";
import { font } from "../theme/typography";

export function useHiddenSections(key) {
  const [hidden, setHidden] = useState(() => new Set(getItem(key) || []));
  const toggle = (id) =>
    setHidden((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      setItem(key, [...next]);
      return next;
    });
  const reset = () => { setHidden(new Set()); setItem(key, []); };
  return { hidden, toggle, reset, isVisible: (id) => !hidden.has(id) };
}

export function CustomizeButton({ sections, hidden, onToggle, onReset }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 6,
          borderColor: theme.borderStrong, borderWidth: 1, borderRadius: theme.radius.md,
          paddingHorizontal: 12, paddingVertical: 8,
        }}
      >
        <SlidersHorizontal size={16} color={theme.text.secondary} />
        <Text style={{ fontFamily: font(600), fontSize: theme.font.small, color: theme.text.secondary }}>Customize</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => {}}
            style={{ backgroundColor: theme.bg.elevated, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: theme.space[5], paddingBottom: theme.space[8] }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: theme.space[4] }}>
              <Text style={{ fontFamily: font(700), fontSize: theme.font.title, color: theme.text.primary }}>Show sections</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}><X size={22} color={theme.text.muted} /></Pressable>
            </View>
            {sections.map((s) => {
              const vis = !hidden.has(s.id);
              return (
                <Pressable
                  key={s.id}
                  onPress={() => onToggle(s.id)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 }}
                >
                  <View
                    style={{
                      width: 22, height: 22, borderRadius: 6,
                      borderWidth: 1.5, borderColor: vis ? theme.primary : theme.borderStrong,
                      backgroundColor: vis ? theme.primary : "transparent",
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {vis && <Check size={14} color={theme.primaryText} />}
                  </View>
                  <Text style={{ flex: 1, fontFamily: font(500), fontSize: theme.font.body, color: theme.text.primary }}>{s.label}</Text>
                </Pressable>
              );
            })}
            <Pressable onPress={onReset} style={{ marginTop: theme.space[3], alignSelf: "flex-start" }}>
              <Text style={{ fontFamily: font(600), fontSize: theme.font.small, color: theme.yellow[600] }}>Reset</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
