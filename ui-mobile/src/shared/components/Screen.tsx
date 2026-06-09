import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { useThemedStyles } from "@/providers/ThemeProvider";
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
      <SafeAreaView style={[styles.safeArea, bgStyle]} edges={edges}>
        <ScrollView
          contentContainerStyle={[inner, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, bgStyle]} edges={edges}>
      <View style={[inner, contentStyle]}>{children}</View>
    </SafeAreaView>
  );
}
