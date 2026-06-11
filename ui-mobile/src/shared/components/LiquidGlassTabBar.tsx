import { useEffect, useState } from "react";
import { LayoutChangeEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
// Min width per tab — when tabCount × this exceeds the bar width, the row
// becomes horizontally scrollable; otherwise tabs evenly fill the width.
const MIN_TAB_WIDTH = 96;

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
      scroll: { flex: 1 },
      row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: ROW_PADDING,
        height: "100%"
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

  const [barWidth, setBarWidth] = useState(0);
  const available = barWidth > 0 ? barWidth - ROW_PADDING * 2 : 0;
  // Fill the bar when tabs fit; otherwise fall back to a fixed min width and scroll.
  const evenWidth = available > 0 ? available / tabCount : 0;
  const tabWidth = evenWidth > 0 ? Math.max(evenWidth, MIN_TAB_WIDTH) : 0;
  const scrollable = tabWidth > evenWidth;

  const indicatorX = useSharedValue(state.index * tabWidth);

  useEffect(() => {
    if (tabWidth === 0) return;
    indicatorX.value = withSpring(state.index * tabWidth, SPRING_CONFIG);
  }, [state.index, tabWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }]
  }));

  function onBarLayout(e: LayoutChangeEvent) {
    setBarWidth(e.nativeEvent.layout.width);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadowRing}>
        <View style={styles.glass} onLayout={onBarLayout}>
          {Platform.OS === "ios" ? (
            <BlurView intensity={70} tint={theme.isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
          )}
          <ScrollView
            horizontal
            scrollEnabled={scrollable}
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={[styles.row, !scrollable && { width: "100%" }]}
          >
            {tabWidth > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.indicatorTrack, { width: tabWidth, height: 48 }, indicatorStyle]}
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
                  style={[styles.item, { width: tabWidth > 0 ? tabWidth : undefined, flexGrow: tabWidth > 0 ? 0 : 1 }]}
                >
                  <Ionicons name={focused ? icons.focused : icons.outline} size={20} color={tint} />
                  <Text style={[styles.label, { color: tint }]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}
