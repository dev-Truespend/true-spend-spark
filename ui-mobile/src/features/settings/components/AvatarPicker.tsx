import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/Button";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { Profile } from "@/features/profile/types/profile.types";

type Props = {
  profile: Profile;
  isUploading: boolean;
  errorMessage?: string | null;
  onPick: () => void;
};

export function AvatarPicker({ profile, isUploading, errorMessage, onPick }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={isUploading}
        onPress={onPick}
        style={styles.avatar}
        testID="avatar-picker.trigger"
      >
        {profile.avatarUrl ? (
          <Image accessibilityLabel="Profile photo" source={{ uri: profile.avatarUrl }} style={styles.image} />
        ) : (
          <Text style={styles.initials}>{profile.initials}</Text>
        )}
        {isUploading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.primaryText} />
          </View>
        ) : null}
      </Pressable>
      <Button
        disabled={isUploading}
        label={isUploading ? "Uploading…" : "Change photo"}
        onPress={onPick}
        variant="secondary"
      />
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 60,
    borderWidth: 1,
    height: 120,
    justifyContent: "center",
    overflow: "hidden",
    width: 120
  },
  image: {
    height: "100%",
    width: "100%"
  },
  initials: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: "700"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center"
  },
  error: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center"
  }
});
