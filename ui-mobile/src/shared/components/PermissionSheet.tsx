import { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, palette, tints } from "@/shared/theme/colors";
import { radii } from "@/shared/theme/spacing";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { Button } from "./Button";

type PermissionSheetProps = {
  visible: boolean;
  icon?: ReactNode;
  iconLabel?: string;
  title: string;
  description: string;
  allowLabel?: string;
  denyLabel?: string;
  onAllow: () => void;
  onDeny: () => void;
};

export function PermissionSheet({
  visible,
  icon,
  iconLabel = "📍",
  title,
  description,
  allowLabel = "Allow",
  denyLabel = "Not now",
  onAllow,
  onDeny
}: PermissionSheetProps) {
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDeny}>
      <Pressable style={styles.overlay} onPress={onDeny}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={[styles.iconBox, { backgroundColor: tints.blue.bg }]}>
            {icon ?? <Text style={styles.iconText}>{iconLabel}</Text>}
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.desc}>{description}</Text>
          <View style={styles.btnRow}>
            <View style={{ flex: 1 }}>
              <Button label={denyLabel} onPress={onDeny} variant="light" />
            </View>
            <View style={{ flex: 1 }}>
              <Button label={allowLabel} onPress={onAllow} variant="primary" />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
    padding: 16
  },
  sheet: {
    backgroundColor: palette.white,
    borderRadius: radii.hero,
    padding: 20,
    alignItems: "center",
    gap: 6
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6
  },
  iconText: { fontSize: scaleFont(22) },
  title: { fontFamily: fontFamily.bold, fontWeight: "700", fontSize: scaleFont(17), color: colors.text },
  desc: { fontFamily: fontFamily.regular, fontSize: scaleFont(13), color: colors.mutedFg, textAlign: "center", lineHeight: 19, marginBottom: 10 },
  btnRow: { flexDirection: "row", gap: 8, alignSelf: "stretch" }
});
