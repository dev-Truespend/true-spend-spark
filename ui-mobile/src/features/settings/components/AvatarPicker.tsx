import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button } from "@/shared/components/Button";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";
import { fontFamily, scaleFont } from "@/shared/theme/typography";
import { Profile } from "@/features/profile/types/profile.types";

type Props = {
  profile: Profile;
  isUploading: boolean;
  errorMessage?: string | null;
  onPick: () => void;
};

export function AvatarPicker({ profile, isUploading, errorMessage, onPick }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      container: { alignItems: "center", gap: 12, paddingVertical: 10 },
      avatarWrap: { width: 108, height: 108, borderRadius: 54, overflow: "hidden" },
      avatar: { flex: 1, alignItems: "center", justifyContent: "center" },
      image: { width: "100%", height: "100%" },
      initials: { color: t.palette.white, fontFamily: fontFamily.heavy, fontSize: scaleFont(32), fontWeight: "800" },
      overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: t.colors.overlay,
        alignItems: "center",
        justifyContent: "center"
      },
      error: { color: t.colors.destructive, fontFamily: fontFamily.medium, fontSize: scaleFont(12), textAlign: "center" }
    })
  );
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        disabled={isUploading}
        onPress={onPick}
        style={styles.avatarWrap}
        testID="avatar-picker.trigger"
      >
        <LinearGradient
          colors={[...theme.gradients.brand]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          {profile.avatarUrl ? (
            <Image
              accessibilityLabel="Profile photo"
              source={{ uri: profile.avatarUrl }}
              style={styles.image}
            />
          ) : (
            <Text style={styles.initials}>{profile.initials}</Text>
          )}
        </LinearGradient>
        {isUploading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color={theme.palette.white} />
          </View>
        ) : null}
      </Pressable>
      <View style={{ alignSelf: "center" }}>
        <Button
          disabled={isUploading}
          label={isUploading ? "Uploading…" : "Change photo"}
          onPress={onPick}
          variant="outline"
          size="sm"
          block={false}
        />
      </View>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}
