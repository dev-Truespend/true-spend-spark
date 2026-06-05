import { Text, View, StyleSheet } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { NotificationType } from "@/features/notification-settings/api/notification-settings.api";

type Props = {
  types: NotificationType[];
};

export function NotificationTypeList({ types }: Props) {
  if (types.length === 0) return null;
  return (
    <View style={styles.list}>
      {types.map((type) => (
        <Text key={type.code} style={styles.item}>
          {type.displayName}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs
  },
  item: {
    color: colors.text
  }
});
