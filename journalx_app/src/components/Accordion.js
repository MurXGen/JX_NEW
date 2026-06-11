/* Smooth collapsible section for mobile. Header (icon + title) toggles the
   body with a LayoutAnimation slide. Bordered, minimal — not a modal/box. */
import React, { useState } from "react";
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Accordion({ title, icon: Icon, right, defaultOpen = true, children }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
    setOpen((o) => !o);
  };
  return (
    <View style={{ borderColor: theme.border, borderWidth: 1, borderRadius: theme.radius.lg, backgroundColor: theme.bg.surface, overflow: "hidden" }}>
      <Pressable onPress={toggle} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14, paddingHorizontal: theme.space[4] }}>
        {Icon ? (
          <View style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: theme.primarySubtle, alignItems: "center", justifyContent: "center" }}>
            <Icon size={14} color={theme.yellow[500]} />
          </View>
        ) : null}
        <Text style={{ flex: 1, fontFamily: font(700), fontSize: theme.font.title, color: theme.text.primary }}>{title}</Text>
        {right}
        <View style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }}>
          <ChevronDown size={18} color={theme.text.muted} />
        </View>
      </Pressable>
      {open && (
        <View style={{ paddingHorizontal: theme.space[4], paddingBottom: theme.space[4], borderTopColor: theme.border, borderTopWidth: 1, paddingTop: theme.space[4] }}>
          {children}
        </View>
      )}
    </View>
  );
}
