/* ============================================================
   JournalX — Telegram-style UI kit (iOS "grouped inset list" look).

   This is the app's design-system layer for the Telegram restyle:
   grouped sections, cells, large titles, segmented controls and
   action buttons. It keeps JournalX's gold accent (theme.tg.tint)
   and the existing green/red P&L colors.

   Screens opt in by composing these primitives, e.g.

     <GroupedScreen title="Settings">
       <Section header="Account" footer="Your journal preferences.">
         <Cell icon={User} title="Profile" value="Murthy" onPress={...} />
         <CellSwitch icon={Moon} title="Dark mode" value={dark} onValueChange={...} />
       </Section>
       <Section>
         <ActionCell title="Log out" destructive onPress={...} />
       </Section>
     </GroupedScreen>

   Everything is theme-reactive and works in both light (default) and
   dark mode. No external deps beyond what the app already uses.
   ============================================================ */
import React, { Children, isValidElement } from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  TextInput,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, Check } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";
import { PressableScale } from "./motion";
import { selectHaptic } from "../lib/haptics";

const HAIRLINE = StyleSheet.hairlineWidth;
const SEP_INSET = 16; // separator left inset (Telegram aligns to text)
const ROW_PAD = 16;

/* ---------------------------------------------------------------
   GroupedScreen — full page: grouped background + large title +
   scrolling content with comfortable bottom inset.
---------------------------------------------------------------- */
export function GroupedScreen({ title, subtitle, right, children, scrollProps, contentStyle }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.tg.groupedBg }}>
      <ScrollView
        contentContainerStyle={[
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {title ? <LargeTitle title={title} subtitle={subtitle} right={right} /> : null}
        {children}
      </ScrollView>
    </View>
  );
}

/* ---------------------------------------------------------------
   LargeTitle — left-aligned iOS/Telegram large title with optional
   right-side action and subtitle.
---------------------------------------------------------------- */
export function LargeTitle({ title, subtitle, right }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: ROW_PAD,
        paddingTop: 6,
        paddingBottom: 14,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={{
            color: theme.text.primary,
            fontSize: 32,
            lineHeight: 38,
            fontFamily: font(800),
            letterSpacing: -0.5,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.text.muted, fontSize: theme.font.small, fontFamily: font(400), marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}

/* ---------------------------------------------------------------
   NavBar — compact top bar: optional back chevron, centered title,
   optional right action. Use for pushed/detail screens.
---------------------------------------------------------------- */
export function NavBar({ title, onBack, right, transparent }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: transparent ? "transparent" : theme.tg.groupedBg,
        borderBottomWidth: transparent ? 0 : HAIRLINE,
        borderBottomColor: theme.tg.separator,
      }}
    >
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 }}>
        <View style={{ width: 76, alignItems: "flex-start" }}>
          {onBack ? (
            <Pressable
              onPress={() => { selectHaptic(); onBack(); }}
              hitSlop={10}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <ChevronLeft size={26} color={theme.tg.tint} />
            </Pressable>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={{ flex: 1, textAlign: "center", color: theme.text.primary, fontSize: theme.font.title, fontFamily: font(600) }}
        >
          {title}
        </Text>
        <View style={{ width: 76, alignItems: "flex-end" }}>{right}</View>
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------
   Section — grouped inset container with optional header (uppercase
   caption) + footer (muted caption). Hairline separators are inserted
   automatically between child rows, inset from the left like iOS.
---------------------------------------------------------------- */
export function Section({ header, footer, children, style, inset = true, firstInGroup }) {
  const { theme } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={[{ marginTop: firstInGroup ? 8 : 22 }, style]}>
      {header ? (
        <Text
          style={{
            color: theme.tg.headerText,
            fontSize: theme.font.caption + 1,
            fontFamily: font(500),
            letterSpacing: 0.4,
            textTransform: "uppercase",
            marginBottom: 7,
            marginHorizontal: inset ? ROW_PAD + 4 : 4,
          }}
        >
          {header}
        </Text>
      ) : null}

      <View
        style={{
          marginHorizontal: inset ? ROW_PAD : 0,
          backgroundColor: theme.tg.cell,
          borderRadius: inset ? 12 : 0,
          overflow: "hidden",
          borderTopWidth: inset ? 0 : HAIRLINE,
          borderBottomWidth: inset ? 0 : HAIRLINE,
          borderColor: theme.tg.separator,
        }}
      >
        {rows.map((child, i) => (
          <View key={child.key ?? i}>
            {child}
            {i < rows.length - 1 ? (
              <View style={{ height: HAIRLINE, backgroundColor: theme.tg.separator, marginLeft: SEP_INSET }} />
            ) : null}
          </View>
        ))}
      </View>

      {footer ? (
        <Text
          style={{
            color: theme.tg.headerText,
            fontSize: theme.font.caption + 1,
            fontFamily: font(400),
            lineHeight: 17,
            marginTop: 7,
            marginHorizontal: inset ? ROW_PAD + 4 : 4,
          }}
        >
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

/* leading icon rendered in a rounded, tinted square (Telegram settings style) */
function IconSquare({ icon: Icon, color, bg }) {
  if (!Icon) return null;
  return (
    <View
      style={{
        width: 29,
        height: 29,
        borderRadius: 7,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: bg,
        marginRight: 14,
      }}
    >
      <Icon size={17} color={color} />
    </View>
  );
}

/* ---------------------------------------------------------------
   Cell — a single grouped row. Supports:
     icon / iconColor / iconBg   leading rounded square
     title / subtitle            primary + secondary text
     value                       muted right-aligned text
     accessory                   "chevron" | "check" | node | none
     selected                    show a tint check (radio/selection)
     destructive                 red title (delete/leave/log out)
     onPress                     pressable w/ highlight + haptic
---------------------------------------------------------------- */
export function Cell({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  value,
  accessory,
  selected,
  destructive,
  onPress,
  titleColor,
  right,
}) {
  const { theme } = useTheme();
  const t = theme.tg;
  const showChevron = accessory === "chevron" || (!accessory && !!onPress && right == null && value == null && !selected);
  const baseTitleColor = destructive ? t.destructive : titleColor || theme.text.primary;

  const inner = ({ pressed }) => (
    <View
      style={{
        minHeight: 48,
        paddingHorizontal: ROW_PAD,
        paddingVertical: subtitle ? 9 : 11,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: pressed && onPress ? t.cellPressed : "transparent",
      }}
    >
      <IconSquare icon={icon} color={iconColor || "#fff"} bg={iconBg || t.tint} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: baseTitleColor, fontSize: theme.font.title, fontFamily: font(destructive ? 600 : 500) }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={{ color: theme.text.muted, fontSize: theme.font.small, fontFamily: font(400), marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value != null ? (
        <Text numberOfLines={1} style={{ color: theme.text.muted, fontSize: theme.font.body, fontFamily: font(400), maxWidth: "46%", marginLeft: 8 }}>
          {value}
        </Text>
      ) : null}

      {right != null ? <View style={{ marginLeft: 8 }}>{right}</View> : null}

      {accessory === "check" || selected ? (
        <Check size={20} color={t.tint} style={{ marginLeft: 8 }} />
      ) : null}

      {showChevron ? <ChevronRight size={19} color={t.chevron} style={{ marginLeft: 6 }} /> : null}
    </View>
  );

  if (!onPress) return <View>{inner({ pressed: false })}</View>;
  return (
    <Pressable
      onPress={() => { selectHaptic(); onPress(); }}
      android_ripple={{ color: t.cellPressed }}
    >
      {inner}
    </Pressable>
  );
}

/* ---------------------------------------------------------------
   CellSwitch — a Cell whose accessory is a native Switch (gold track).
---------------------------------------------------------------- */
export function CellSwitch({ icon, iconColor, iconBg, title, subtitle, value, onValueChange }) {
  const { theme } = useTheme();
  const t = theme.tg;
  return (
    <View style={{ minHeight: 48, paddingHorizontal: ROW_PAD, paddingVertical: subtitle ? 9 : 8, flexDirection: "row", alignItems: "center" }}>
      <IconSquare icon={icon} color={iconColor || "#fff"} bg={iconBg || t.tint} />
      <View style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
        <Text numberOfLines={1} style={{ color: theme.text.primary, fontSize: theme.font.title, fontFamily: font(500) }}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={2} style={{ color: theme.text.muted, fontSize: theme.font.small, fontFamily: font(400), marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Switch
        value={!!value}
        onValueChange={(v) => { selectHaptic(); onValueChange?.(v); }}
        trackColor={{ false: theme.borderStrong, true: t.tint }}
        thumbColor="#ffffff"
        ios_backgroundColor={theme.borderStrong}
      />
    </View>
  );
}

/* ---------------------------------------------------------------
   ActionCell — a full-width centered tappable row used for actions
   (e.g. "Log out", "Delete journal"). Gold by default, red if
   destructive. Lives inside its own <Section>.
---------------------------------------------------------------- */
export function ActionCell({ title, onPress, destructive, tint }) {
  const { theme } = useTheme();
  const t = theme.tg;
  const color = destructive ? t.destructive : tint || t.tint;
  return (
    <Pressable onPress={() => { selectHaptic(); onPress?.(); }} android_ripple={{ color: t.cellPressed }}>
      {({ pressed }) => (
        <View style={{ minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: pressed ? t.cellPressed : "transparent" }}>
          <Text style={{ color, fontSize: theme.font.title, fontFamily: font(destructive ? 600 : 500) }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

/* ---------------------------------------------------------------
   InsetInput — a text field that sits inside a grouped Section as a
   cell (label on the left, input fills the rest).
---------------------------------------------------------------- */
export function InsetInput({ label, icon, iconBg, value, onChangeText, placeholder, ...rest }) {
  const { theme } = useTheme();
  const t = theme.tg;
  return (
    <View style={{ minHeight: 48, paddingHorizontal: ROW_PAD, paddingVertical: 6, flexDirection: "row", alignItems: "center" }}>
      <IconSquare icon={icon} color="#fff" bg={iconBg || t.tint} />
      {label ? (
        <Text style={{ color: theme.text.primary, fontSize: theme.font.title, fontFamily: font(500), width: 104 }}>
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.text.muted}
        style={{ flex: 1, color: theme.text.primary, fontSize: theme.font.title, fontFamily: font(400), paddingVertical: 8 }}
        {...rest}
      />
    </View>
  );
}

/* ---------------------------------------------------------------
   Segmented — Telegram/iOS segmented control. options: string[].
---------------------------------------------------------------- */
export function Segmented({ options = [], value, onChange, style }) {
  const { theme } = useTheme();
  const t = theme.tg;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          backgroundColor: theme.bg.muted,
          borderRadius: 9,
          padding: 2,
          marginHorizontal: ROW_PAD,
        },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => { selectHaptic(); onChange?.(opt); }}
            style={{
              flex: 1,
              paddingVertical: 7,
              borderRadius: 7,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? theme.tg.cell : "transparent",
              shadowColor: "#000",
              shadowOpacity: active ? 0.12 : 0,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 1 },
              elevation: active ? 2 : 0,
            }}
          >
            <Text style={{ color: active ? theme.text.primary : theme.text.secondary, fontSize: theme.font.small, fontFamily: font(active ? 600 : 500) }}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------
   PrimaryButton — full-width filled action button (gold), with the
   app's spring-press + haptic. For the bottom of forms/sheets.
---------------------------------------------------------------- */
export function PrimaryButton({ title, onPress, disabled, style }) {
  const { theme } = useTheme();
  const t = theme.tg;
  return (
    <PressableScale
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      haptic={!disabled}
      style={[
        {
          marginHorizontal: ROW_PAD,
          height: 50,
          borderRadius: 12,
          backgroundColor: t.tint,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      <Text style={{ color: theme.primaryText, fontSize: theme.font.title, fontFamily: font(600) }}>{title}</Text>
    </PressableScale>
  );
}

export default {
  GroupedScreen,
  LargeTitle,
  NavBar,
  Section,
  Cell,
  CellSwitch,
  ActionCell,
  InsetInput,
  Segmented,
  PrimaryButton,
};
