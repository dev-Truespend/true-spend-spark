import { useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { scaleFont } from "@/shared/theme/typography";

type IconName = keyof typeof Ionicons.glyphMap;

const ICON_MAP: Record<string, { focused: IconName; outline: IconName }> = {
  index: { focused: "wallet", outline: "wallet-outline" },
  insights: { focused: "stats-chart", outline: "stats-chart-outline" },
  profile: { focused: "person", outline: "person-outline" }
};

const SPRING_CONFIG = { damping: 18, stiffness: 220, mass: 0.6 };
const ROW_PADDING = 6;

export function LiquidGlassTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      wrap: {
        position: "absolute",
        left: t.spacing.md,
        right: t.spacing.md,
        alignItems: "center"
      },
      shadowRing: {
        width: "100%",
        borderRadius: t.radii.pill,
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 12
      },
      glass: {
        width: "100%",
        height: 60,
        borderRadius: t.radii.pill,
        overflow: "hidden",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: t.isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.6)"
      },
      androidFallback: {
        backgroundColor: t.isDark ? "rgba(22,27,34,0.92)" : "rgba(255,255,255,0.92)"
      },
      row: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: ROW_PADDING
      },
      indicatorTrack: {
        position: "absolute",
        top: 6,
        left: ROW_PADDING
      },
      indicatorPill: {
        flex: 1,
        borderRadius: t.radii.pill,
        backgroundColor: t.colors.primary,
        shadowColor: t.colors.primary,
        shadowOpacity: 0.35,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 }
      },
      item: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        zIndex: 1
      },
      label: {
        fontFamily: t.fontFamily.semibold,
        fontWeight: "600",
        fontSize: scaleFont(10),
        letterSpacing: 0.2
      }
    })
  );

  const tabCount = state.routes.length;

  const [rowWidth, setRowWidth] = useState(0);
  const tabWidth = rowWidth > 0 ? (rowWidth - ROW_PADDING * 2) / tabCount : 0;

  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    if (tabWidth === 0) return;
    indicatorX.value = withSpring(state.index * tabWidth, SPRING_CONFIG);
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }]
  }));

  function onRowLayout(e: LayoutChangeEvent) {
    setRowWidth(e.nativeEvent.layout.width);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadowRing}>
        <View style={styles.glass}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={70} tint={theme.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
          )}
          <View style={styles.row} onLayout={onRowLayout}>
            {tabWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.indicatorTrack,
                  { width: tabWidth, height: 48 },
                  indicatorStyle
                ]}
              >
                <View style={styles.indicatorPill} />
              </Animated.View>
            ) : null}
            {state.routes.map((route, index) => {
              const focused = state.index === index;
              const descriptor = descriptors[route.key];
              const label = String(descriptor.options.title ?? route.name);
              const icons = ICON_MAP[route.name] ?? { focused: "ellipse", outline: "ellipse-outline" };
              const tint = focused ? theme.palette.white : theme.colors.mutedFg;

              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={descriptor.options.tabBarAccessibilityLabel ?? label}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true
                    });
                    if (!focused && !event.defaultPrevented) {
                      navigation.navigate(route.name, route.params);
                    }
                  }}
                  onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
                  style={styles.item}
                >
                  <Ionicons
                    name={focused ? icons.focused : icons.outline}
                    size={20}
                    color={tint}
                  />
                  <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
