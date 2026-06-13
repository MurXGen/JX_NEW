/* App background — a clean, SOLID canvas (no gradient, no glow blobs).
   Light mode = soft off-white, dark mode = deep navy. Children render on top. */
import React from "react";
import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export default function GradientBackground({ children, style }) {
  const { theme } = useTheme();
  return (
    <View style={[{ flex: 1, backgroundColor: theme.bg.canvas }, style]}>
      {children}
    </View>
  );
}
