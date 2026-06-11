/* First-run guide — a paged, swipeable walkthrough shown once after login.
   Mirrors the web onboarding: journal ready → log fast → watch your edge. */
import React, { useRef, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BarChart3, PlusCircle, Sparkles, Wallet } from "lucide-react-native";
import { useTheme } from "../theme/ThemeProvider";
import { Button } from "./ui";
import { MotionView } from "./motion";
import { font } from "../theme/typography";

const STEPS = [
  { icon: Wallet, accent: "#22d3ee", title: "Your journal is ready", body: "We've set up your first trading journal. Everything you log lives here — private and yours." },
  { icon: PlusCircle, accent: "#34d399", title: "Log a trade in seconds", body: "Quick log for P&L only, or detailed with entries, risk and emotion. It takes about ten seconds." },
  { icon: BarChart3, accent: "#fcd535", title: "Watch your edge grow", body: "Your dashboard turns every trade into analytics — win rate, equity curve, sessions and more." },
];

const { width } = Dimensions.get("window");

export default function OnboardingModal({ visible, onDone }) {
  const { theme } = useTheme();
  const scroller = useRef(null);
  const [i, setI] = useState(0);
  const last = i === STEPS.length - 1;

  const next = () => {
    if (last) return onDone?.();
    const ni = i + 1;
    setI(ni);
    scroller.current?.scrollTo({ x: ni * width, animated: true });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onDone}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg.canvas }}>
        <View style={{ flexDirection: "row", justifyContent: "flex-end", padding: theme.space[5] }}>
          <Pressable onPress={onDone} hitSlop={10}>
            <Text style={{ color: theme.text.muted, fontFamily: font(600), fontSize: theme.font.body }}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          style={{ flex: 1 }}
        >
          {STEPS.map((s) => (
            <View key={s.title} style={{ width, alignItems: "center", justifyContent: "center", padding: theme.space[7] }}>
              <MotionView delay={60}>
                <View style={{ alignItems: "center", gap: theme.space[4] }}>
                  <View style={{ width: 96, height: 96, borderRadius: 28, backgroundColor: `${s.accent}22`, alignItems: "center", justifyContent: "center" }}>
                    <s.icon size={44} color={s.accent} />
                  </View>
                  <Text style={{ fontFamily: font(800), fontSize: theme.font.h1, color: theme.text.primary, textAlign: "center" }}>
                    {s.title}
                  </Text>
                  <Text style={{ fontFamily: font(400), fontSize: theme.font.bodyMd, color: theme.text.muted, textAlign: "center", lineHeight: 22, maxWidth: 320 }}>
                    {s.body}
                  </Text>
                </View>
              </MotionView>
            </View>
          ))}
        </ScrollView>

        {/* dots */}
        <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: theme.space[5] }}>
          {STEPS.map((_, idx) => (
            <View
              key={idx}
              style={{
                width: idx === i ? 22 : 8, height: 8, borderRadius: 999,
                backgroundColor: idx === i ? theme.primary : theme.borderStrong,
              }}
            />
          ))}
        </View>

        <View style={{ padding: theme.space[5], paddingTop: 0 }}>
          <Button title={last ? "Start journaling" : "Next"} onPress={next} icon={last ? Sparkles : undefined} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
