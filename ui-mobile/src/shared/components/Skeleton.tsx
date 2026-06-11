import { useEffect, useRef } from "react";
import { Animated, StyleSheet, ViewStyle } from "react-native";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { radii } from "@/shared/theme/spacing";

type SkeletonProps = {
  height?: number;
  width?: number | string;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({ height = 16, width = "100%", radius = radii.sm, style }: SkeletonProps) {
  const styles = useThemedStyles(buildStyles);
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { height, width: width as ViewStyle["width"], borderRadius: radius, opacity },
        style
      ]}
    />
  );
}

const buildStyles = (t: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: { backgroundColor: t.colors.surfaceAlt }
  });
