import { StyleSheet, Text, View } from "react-native";
import { Switch } from "@/shared/components/Switch";
import { NotificationType } from "@/features/notification-settings/api/notification-settings.api";
import { useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";

type Props = {
  types: NotificationType[];
  onToggle?: (typeCode: string, enabled: boolean) => void;
  disabled?: boolean;
};

export function NotificationTypeList({ types, onToggle, disabled }: Props) {
  const styles = useStyles();
  if (types.length === 0) return null;
  return (
    <View style={{ gap: 2 }}>
      {types.map((type) => (
        <View key={type.code} style={[styles.row, disabled && styles.disabled]}>
          <Text style={styles.label}>{type.displayName}</Text>
          {onToggle ? (
            <Switch value={type.enabled} onChange={(v) => onToggle(type.code, v)} disabled={disabled} />
          ) : (
            <Text style={[styles.state, type.enabled ? styles.on : styles.off]}>
              {type.enabled ? "On" : "Off"}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const useStyles = () =>
  useThemedStyles((t) =>
    StyleSheet.create({
      row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
      disabled: { opacity: 0.55 },
      label: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: t.colors.text },
      state: { fontFamily: fontFamily.semibold, fontWeight: "600", fontSize: scaleFont(11) },
      on: { color: t.colors.teal },
      off: { color: t.colors.mutedFg }
    })
  );
