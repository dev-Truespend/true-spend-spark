import { StyleSheet, Text, View } from "react-native";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type GreetingProps = {
  name?: string | null;
  greeting?: string;
};

function defaultGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ name, greeting }: GreetingProps) {
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      row: { paddingTop: 0, paddingBottom: 4 },
      greeting: { fontFamily: fontFamily.medium, fontSize: scaleFont(12), color: t.colors.mutedFg },
      name: {
        fontFamily: fontFamily.heavy,
        fontSize: scaleFont(22),
        fontWeight: "800",
        color: t.colors.text,
        letterSpacing: -0.4,
        marginTop: 2,
        lineHeight: 26
      }
    })
  );
  return (
    <View style={styles.row}>
      <Text style={styles.greeting}>{greeting ?? defaultGreeting()}</Text>
      <Text style={styles.name}>{name ?? "Welcome"} 👋</Text>
    </View>
  );
}
