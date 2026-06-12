/* GradientBackground — full-screen premium backdrop used behind every screen.
   Dark mode: deep navy canvas with large, soft "aurora" glow blobs in the
   brand yellow / success green / danger red tints (very low alpha).
   Light mode: soft pastel equivalents. Pure presentation — children render
   on top untouched. */
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

let LinearGradient = null;
try { LinearGradient = require("expo-linear-gradient").LinearGradient; } catch {}

/* one soft radial-ish glow: a gradient fading to transparent inside a huge circle */
function Blob({ colors, size, top, left, right, bottom }) {
  if (!LinearGradient) return null; // no gradient lib -> skip glows, canvas still fine
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.5, y: 0.1 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        top,
        left,
        right,
        bottom,
      }}
    />
  );
}

export default function GradientBackground({ children, style }) {
  const { theme } = useTheme();
  const g = theme.gradients;
  return (
    <View style={[{ flex: 1, backgroundColor: theme.bg.canvas }, style]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {LinearGradient ? (
          <LinearGradient
            colors={g.canvas}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {/* aurora glows — brand yellow top-left, green right, red bottom */}
        <Blob colors={g.blobBrand} size={420} top={-160} left={-120} />
        <Blob colors={g.blobSuccess} size={340} top={120} right={-150} />
        <Blob colors={g.blobDanger} size={380} bottom={-150} left={-70} />
      </View>
      {children}
    </View>
  );
}
