import { Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, palette } from "@/shared/theme/colors";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { Profile } from "@/features/profile/types/profile.types";

type Props = {
  profile: Profile;
  centered?: boolean;
};

export function ProfileHeader({ profile, centered = false }: Props) {
  const hasAvatar = !!profile.avatarUrl;
  const avatar = (
    <LinearGradient
      colors={[...gradients.brand]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.avatar, centered && styles.avatarCentered]}
    >
      {hasAvatar ? (
        <Image
          accessibilityLabel="Profile photo"
          source={{ uri: profile.avatarUrl ?? undefined }}
          style={styles.image}
        />
      ) : (
        <Text
          style={[styles.initials, centered && styles.initialsCentered]}
          accessibilityLabel={`Initials ${profile.initials}`}
        >
          {profile.initials}
        </Text>
      )}
    </LinearGradient>
  );

  if (centered) {
    return (
      <View style={styles.centered}>
        {avatar}
        <Text style={styles.nameCentered} numberOfLines={1}>{profile.displayName}</Text>
        <Text style={styles.emailCentered} numberOfLines={1}>{profile.email}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {avatar}
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
        <Text style={styles.email} numberOfLines={1}>{profile.email}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  centered: { alignItems: "center", gap: 6, paddingVertical: 12 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  avatarCentered: { width: 72, height: 72, borderRadius: 36 },
  image: { width: "100%", height: "100%" },
  initials: {
    color: palette.white,
    fontFamily: fontFamily.heavy,
    fontSize: scaleFont(22),
    fontWeight: "800",
    letterSpacing: 0.4
  },
  initialsCentered: { fontSize: scaleFont(24) },
  text: { flex: 1 },
  name: { color: colors.text, fontFamily: fontFamily.bold, fontSize: scaleFont(18), fontWeight: "700" },
  email: { color: colors.mutedFg, fontFamily: fontFamily.regular, fontSize: scaleFont(13), marginTop: 2 },
  nameCentered: {
    color: colors.text,
    fontFamily: fontFamily.bold,
    fontSize: scaleFont(18),
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center"
  },
  emailCentered: {
    color: colors.mutedFg,
    fontFamily: fontFamily.regular,
    fontSize: scaleFont(13),
    textAlign: "center"
  }
});
