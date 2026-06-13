/* Motion primitives built on react-native-reanimated — tuned for a smooth,
   "Telegram-like" feel: springy entrances + tactile scale-on-press. */
import React from "react";
import { Pressable } from "react-native";
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { tapHaptic } from "../lib/haptics";

const SPRING = { damping: 16, stiffness: 380, mass: 0.6 };

/* soft, slightly bouncy entrance */
export function MotionView({ children, delay = 0, duration = 320, style }) {
  return (
    <Animated.View entering={FadeInDown.duration(duration).delay(delay).springify().damping(18)} style={style}>
      {children}
    </Animated.View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* press-to-scale Pressable with a spring + light haptic — the core
   micro-interaction that makes taps feel responsive everywhere. */
export function PressableScale({ children, style, onPress, onLongPress, disabled, scaleTo = 0.96, haptic = true, hitSlop, ...rest }) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => { s.value = withSpring(scaleTo, SPRING); }}
      onPressOut={() => { s.value = withSpring(1, SPRING); }}
      onPress={(e) => { if (haptic && !disabled) tapHaptic(); onPress?.(e); }}
      onLongPress={onLongPress}
      style={[aStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export default MotionView;
