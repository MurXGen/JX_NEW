/* Lightweight entrance animation wrapper built on react-native-reanimated
   (bundled with the Expo SDK → works in Expo Go). Replaces Moti, which had a
   React-context incompatibility under SDK 51. */
import React from "react";
import Animated, { FadeInDown } from "react-native-reanimated";

export function MotionView({ children, delay = 0, duration = 350, style }) {
  return (
    <Animated.View entering={FadeInDown.duration(duration).delay(delay)} style={style}>
      {children}
    </Animated.View>
  );
}

export default MotionView;
