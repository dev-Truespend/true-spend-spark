import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { Edge, useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { useChromeActive } from "@/shared/navigation/chromeInset";
import { spacing } from "@/shared/theme/spacing";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  background?: "default" | "surface" | "transparent";
  edges?: readonly Edge[];
  contentStyle?: ViewStyle;
}>;

export function Screen({
  children,
  scroll = false,
  padded = true,
  background = "default",
  edges,
  contentStyle
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  // When the shared chrome is mounted it already consumed the top safe area, so
  // re-applying it here would leave an empty band beneath the chrome.
  const chromeActive = useChromeActive();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      safeArea: { flex: 1 },
      default: { backgroundColor: t.colors.background },
      surface: { backgroundColor: t.colors.surface },
      transparent: { backgroundColor: "transparent" }
    })
  );

  const bgStyle =
    background === "transparent"
      ? styles.transparent
      : background === "surface"
        ? styles.surface
        : styles.default;

  // Manual safe-area padding (was <SafeAreaView>). We read insets via the hook
  // so the chrome override actually takes effect — see chromeInset.ts.
  const want = (e: Edge) => !edges || edges.includes(e);
  const safePad: ViewStyle = {
    paddingTop: chromeActive ? 0 : want("top") ? insets.top : 0,
    paddingBottom: want("bottom") ? insets.bottom : 0,
    paddingLeft: want("left") ? insets.left : 0,
    paddingRight: want("right") ? insets.right : 0
  };

  // Bottom padding clears the floating liquid-glass tab bar (60px pill + lift).
  const inner: ViewStyle = {
    flex: scroll ? undefined : 1,
    paddingHorizontal: padded ? spacing.md : 0,
    paddingTop: 0,
    paddingBottom: padded ? spacing.lg + 80 : 0,
    gap: padded ? spacing.md : 0
  };

  if (scroll) {
    return (
      <View style={[styles.safeArea, bgStyle, safePad]}>
        <ScrollView
          contentContainerStyle={[inner, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, bgStyle, safePad]}>
      <View style={[inner, contentStyle]}>{children}</View>
    </View>
  );
}
