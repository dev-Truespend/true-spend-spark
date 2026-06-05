import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>That route doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          Go home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: "center",
    padding: spacing.lg
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  link: {
    color: colors.primary,
    fontWeight: "700"
  }
});
