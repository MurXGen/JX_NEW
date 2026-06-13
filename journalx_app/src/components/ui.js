/* Base UI primitives for JournalX mobile — premium glassmorphic + gradient
   edition. Every primitive keeps its original API; new exports: Grad,
   GlassBackdrop, GlassCard, SectionLabel. */
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CheckCircle2, AlertCircle, Info as InfoIcon } from "lucide-react-native";
import { MotionView, PressableScale } from "./motion";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";

/* expo-linear-gradient / expo-blur are lazy-loaded so the app still runs
   (with graceful solid-colour fallbacks) before `npx expo install` is run. */
let LinearGradient = null;
try { LinearGradient = require("expo-linear-gradient").LinearGradient; } catch {}
let BlurView = null;
try { BlurView = require("expo-blur").BlurView; } catch {}

/* ---- Grad: LinearGradient with a solid-colour fallback ---- */
export function Grad({ colors, start, end, locations, style, children, ...rest }) {
  // Gradients are disabled app-wide — render a SOLID fill of the first colour.
  return (
    <View style={[{ backgroundColor: colors?.[0] }, style]} {...rest}>
      {children}
    </View>
  );
}

/* ---- GlassBackdrop: absolute-fill frosted layer (blur + translucent tint).
   Use inside any rounded container with overflow:"hidden". ---- */
export function GlassBackdrop({ strong, style }) {
  const { theme } = useTheme();
  const g = theme.glass;
  // solid surface fill — no blur/translucency (clean MobiKwik/Lens look)
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: strong ? g.surfaceStrong : g.surface }, style]} />
  );
}

/* ---- GlassCard: frosted card — blur/translucent bg, 1px glass border,
   radius.xl and a subtle top highlight line. ---- */
export function GlassCard({ children, style, flat, strong, noPad }) {
  const { theme } = useTheme();
  // clean SOLID card: white (light) / surface (dark), hairline border, no blur,
  // no sheen, no heavy shadow — matches the reference UI.
  return (
    <View
      style={[
        {
          backgroundColor: flat ? theme.bg.muted : theme.bg.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: theme.radius.lg,
          padding: noPad ? 0 : theme.space[5],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* Card — now renders glass by default; `flat` keeps the muted solid look. */
export function Card({ children, style, flat }) {
  return (
    <GlassCard flat={flat} style={style}>
      {children}
    </GlassCard>
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

  // solid buttons + Telegram-style spring press & light haptic
  return (
    <PressableScale
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      haptic={!isDisabled}
      style={[
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
          opacity: isDisabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        <>
          {Icon ? <Icon size={18} color={p.fg} /> : null}
          <Text style={{ color: p.fg, fontFamily: font(600), fontSize: theme.font.body }}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

export function Field({ label, children }) {
  const { theme } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text style={{ color: theme.text.secondary, fontSize: theme.font.small, fontFamily: font(600) }}>
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
        backgroundColor: theme.glass.input,
        borderColor: theme.glass.border,
        borderWidth: 1,
        borderRadius: theme.radius.md,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: theme.text.primary,
        fontSize: theme.font.body,
        fontFamily: font(400),
      }}
      {...rest}
    />
  );
}

export function Badge({ children, tone = "neutral" }) {
  const { theme } = useTheme();
  const brand = { bg: theme.accent.subtle, fg: theme.accent.text, border: theme.accent.border };
  const tones = {
    neutral: { bg: theme.bg.muted, fg: theme.text.secondary },
    brand,
    success: { bg: theme.successSubtle, fg: theme.successStrong },
    danger: { bg: theme.dangerSubtle, fg: theme.dangerStrong },
    warn: brand,
  };
  const t = tones[tone] || tones.neutral;
  return (
    <View style={{ backgroundColor: t.bg, borderRadius: theme.radius.pill, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start", borderWidth: t.border ? 1 : 0, borderColor: t.border || "transparent" }}>
      <Text style={{ color: t.fg, fontSize: theme.font.caption, fontFamily: font(700) }}>{children}</Text>
    </View>
  );
}

/* Uppercase letter-spaced section caption for grouping screen content. */
export function SectionLabel({ children, style }) {
  const { theme } = useTheme();
  return (
    <Text
      style={[
        {
          color: theme.text.muted,
          fontSize: theme.font.caption,
          fontFamily: font(700),
          letterSpacing: 1.2,
          textTransform: "uppercase",
        },
        style,
      ]}
    >
      {children}
    </Text>
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
  const map = {
    success: { color: theme.success, Icon: CheckCircle2 },
    danger: { color: theme.danger, Icon: AlertCircle },
    info: { color: theme.yellow[400], Icon: InfoIcon },
  };
  const { color, Icon } = map[toast.type] || map.info;
  return (
    <MotionView
      style={{
        position: "absolute",
        top: insets.top + 10,
        left: 16,
        right: 16,
        zIndex: 1000,
        elevation: 24,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderColor: theme.glass.border,
        borderWidth: 1,
        borderRadius: 14,
        overflow: "hidden",
        paddingVertical: 13,
        paddingHorizontal: 14,
        shadowColor: "#000",
        shadowOpacity: 0.16,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
      }}
    >
      <GlassBackdrop strong />
      <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }}>
        <Icon size={17} color={color} />
      </View>
      <Text style={{ flex: 1, color: theme.text.primary, fontSize: theme.font.small, fontFamily: font(500), lineHeight: 19 }}>
        {toast.msg}
      </Text>
    </MotionView>
  );
}

export function H1({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.text.primary, fontSize: theme.font.h2, fontFamily: font(700) }, style]}>{children}</Text>;
}
export function Muted({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[{ color: theme.text.muted, fontSize: theme.font.body, fontFamily: font(400) }, style]}>{children}</Text>;
}
