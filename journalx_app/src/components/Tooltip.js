/* Anchored tooltip popover — tap an ⓘ or a chart element and a small bubble
   appears near the touch point (not a toast). Dismiss by tapping anywhere. */
import React, { createContext, useContext, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { font } from "../theme/typography";

const TipCtx = createContext({ show: () => {}, hide: () => {} });
const { width: W, height: H } = Dimensions.get("window");

export function TooltipProvider({ children }) {
  const { theme } = useTheme();
  const [tip, setTip] = useState(null); // { text, x, y }

  const show = (text, evt) => {
    if (!text) return;
    const x = evt?.nativeEvent?.pageX ?? W / 2;
    const y = evt?.nativeEvent?.pageY ?? H / 3;
    setTip({ text, x, y });
  };
  const hide = () => setTip(null);

  const bubbleW = Math.min(260, W - 32);
  const left = tip ? Math.max(16, Math.min(tip.x - bubbleW / 2, W - 16 - bubbleW)) : 0;
  const below = tip ? tip.y < H * 0.55 : true;

  return (
    <TipCtx.Provider value={{ show, hide }}>
      {children}
      {tip && (
        <Pressable onPress={hide} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000 }}>
          <View
            style={{
              position: "absolute",
              left,
              top: below ? Math.min(tip.y + 14, H - 140) : undefined,
              bottom: below ? undefined : Math.min(H - tip.y + 14, H - 100),
              width: bubbleW,
              backgroundColor: theme.bg.elevated,
              borderColor: theme.borderStrong,
              borderWidth: 1,
              borderRadius: 12,
              padding: 12,
              shadowColor: "#000",
              shadowOpacity: 0.22,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
              elevation: 24,
            }}
          >
            <Text style={{ color: theme.text.primary, fontSize: theme.font.small, fontFamily: font(500), lineHeight: 19 }}>
              {tip.text}
            </Text>
          </View>
        </Pressable>
      )}
    </TipCtx.Provider>
  );
}

export const useTip = () => useContext(TipCtx);
