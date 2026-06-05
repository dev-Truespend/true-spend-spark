import { Image, StyleSheet, Text, View } from "react-native";
import { colors } from "@/shared/theme/colors";
import { spacing } from "@/shared/theme/spacing";
import { Profile } from "@/features/profile/types/profile.types";

type Props = {
  profile: Profile;
};

export function ProfileHeader({ profile }: Props) {
  const hasAvatar = !!profile.avatarUrl;
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        {hasAvatar ? (
          <Image accessibilityLabel="Profile photo" source={{ uri: profile.avatarUrl ?? undefined }} style={styles.image} />
        ) : (
          <Text style={styles.initials} accessibilityLabel={`Initials ${profile.initials}`}>
            {profile.initials}
          </Text>
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
        <Text style={styles.email} numberOfLines={1}>{profile.email}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 36,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72
  },
  image: {
    height: "100%",
    width: "100%"
  },
  initials: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: "700"
  },
  text: {
    flex: 1
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700"
  },
  email: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 2
  }
});
