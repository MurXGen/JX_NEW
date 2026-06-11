/* Base UI primitives for JournalX mobile — themed to match the web app.
   Kept in one file for Phase 0; can be split as the library grows. */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotionView } from "./motion";
import { useTheme } from "../theme/ThemeProvider";

export function Card({ children, style, flat }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          padding: theme.space[5],
        },
        flat && { backgroundColor: theme.bg.muted },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled,
  loading,
  icon: Icon,
  style,
}) {
  const { theme } = useTheme();
  const palettes = {
    primary: { bg: theme.primary, fg: theme.primaryText, border: "transparent" },
    secondary: { bg: theme.bg.muted, fg: theme.text.primary, border: theme.border },
    outline: { bg: "transparent", fg: theme.text.primary, border: theme.borderStrong },
    ghost: { bg: "transparent", fg: theme.text.secondary, border: "transparent" },
    danger: { bg: theme.danger, fg: "#fff", border: "transparent" },
  };
  const p = palettes[variant] || palettes.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        {
          backgroundColor: p.bg,
          borderColor: p.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          paddingVertical: 13,
          paddingHorizontal: theme.space[5],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={p.fg} /> : null}
          <Text style={{ color: p.fg, fontWeight: "600", fontSize: theme.font.body }}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Field({ label, children }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ color: theme.text.secondary, fontSize: theme.font.small, fontWeight: "600" }}>
          {label}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function Input({ value, onChangeText, placeholder, ...rest }) {
  const { theme } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.text.muted}
      style={{
        backgroundColor: theme.bg.surface,
        borderColor: theme.border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: theme.text.primary,
        fontSize: theme.font.body,
      }}
      {...rest}
    />
  );
}

export function Badge({ children, tone = "neutral" }) {
  const { theme } = useTheme();
  const tones = {
    neutral: { bg: theme.bg.muted, fg: theme.text.secondary },
    brand: { bg: theme.primarySubtle, fg: theme.yellow[600] },
    success: { bg: theme.successSubtle, fg: theme.successStrong },
    danger: { bg: theme.dangerSubtle, fg: theme.dangerStrong },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" }}>
      <Text style={{ color: t.fg, fontSize: theme.font.caption, fontWeight: "700" }}>{children}</Text>
    </View>
  );
}

export function Screen({ children, style }) {
  const { theme } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.bg.canvas }, style]}>{children}</View>
  );
}

export function Toast({ toast }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  const colors = {
    success: theme.success,
    danger: theme.danger,
    info: theme.primary,
  };
  const accent = colors[toast.type] || theme.borderStrong;
  return (
    <MotionView
      style={{
        position: "absolute",
        // sit below the status bar / notch so the text is never hidden
        top: insets.top + 10,
        left: 16,
        right: 16,
        zIndex: 1000,
        elevation: 24,
        backgroundColor: theme.bg.elevated,
        borderColor: accent,
        borderWidth: 1,
        borderLeftWidth: 4,
        borderRadius: theme.radius.md,
        paddingVertical: 14,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      }}
    >
      <Text style={{ color: theme.text.primary, fontSize: theme.font.body, fontWeight: "600" }}>
        {toast.msg}
      </Text>
    </MotionView>
  );
}

export function H1({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.text.primary, fontSize: theme.font.h2, fontWeight: "700" }, style]}>{children}</Text>;
}
export function Muted({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.text.muted, fontSize: theme.font.body }, style]}>{children}</Text>;
}
