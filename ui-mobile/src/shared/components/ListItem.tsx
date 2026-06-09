import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import { TintName } from "@/shared/theme/colors";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { scaleFont } from "@/shared/theme/typography";

type ListItemProps = {
  title: string;
  subtitle?: string;
  meta?: string;
  amount?: string;
  amountTone?: "default" | "muted" | "positive" | "destructive";
  iconLabel?: string;
  iconTone?: TintName;
  iconNode?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
  style?: ViewStyle;
};

export function ListItem({
  title,
  subtitle,
  meta,
  amount,
  amountTone = "default",
  iconLabel,
  iconTone = "muted",
  iconNode,
  trailing,
  onPress,
  divider = true,
  style
}: ListItemProps) {
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
      divider: { borderBottomWidth: 1, borderBottomColor: t.colors.border },
      iconBox: {
        width: 36,
        height: 36,
        borderRadius: t.radii.md,
        alignItems: "center",
        justifyContent: "center"
      },
      iconText: { fontFamily: t.fontFamily.bold, fontWeight: "700", fontSize: scaleFont(14) },
      title: { fontFamily: t.fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(14), color: t.colors.text },
      meta: { fontFamily: t.fontFamily.regular, fontSize: scaleFont(11), color: t.colors.mutedFg, marginTop: 2 },
      amount: { fontFamily: t.fontFamily.bold, fontSize: scaleFont(14), fontWeight: "700", marginLeft: 8 },
      pressed: { opacity: 0.7 }
    })
  );

  const toneSet = theme.tints[iconTone];
  const amountColor =
    amountTone === "destructive"
      ? theme.colors.destructive
      : amountTone === "positive"
        ? theme.colors.successText
        : amountTone === "muted"
          ? theme.colors.mutedFg
          : theme.colors.text;

  const body = (
    <View style={[styles.row, divider && styles.divider, style]}>
      <View style={[styles.iconBox, { backgroundColor: toneSet.bg }]}>
        {iconNode ?? <Text style={[styles.iconText, { color: toneSet.fg }]}>{iconLabel ?? "•"}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.meta} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing ?? (amount ? <Text style={[styles.amount, { color: amountColor }]}>{amount}</Text> : null)}
    </View>
  );

  if (onPress) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {body}
      </Pressable>
    );
  }
  return body;
}
