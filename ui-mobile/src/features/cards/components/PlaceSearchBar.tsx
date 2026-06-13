import { useState } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "@/shared/components/TextInput";
import type { NearbyMerchant } from "@/features/cards/types/home.types";
import { categoryEmoji } from "@/features/cards/utils/categoryEmoji";
import { useSearchPlaces } from "@/features/cards/hooks/useSearchPlaces";
import { useTheme, useThemedStyles } from "@/providers/ThemeProvider";

type Props = {
  center: { lat: number; lng: number } | null;
  onSelect: (merchant: NearbyMerchant) => void;
};

// Location-biased place search: type a store/brand, tap a result to get its best card. A result is a
// NearbyMerchant, so onSelect feeds the exact same place → best-card path as tapping a map pin.
export function PlaceSearchBar({ center, onSelect }: Props) {
  const styles = useThemedStyles(buildStyles);
  const t = useTheme();
  const [query, setQuery] = useState("");
  const { results, isSearching, isActive } = useSearchPlaces(query, center);

  function handleSelect(merchant: NearbyMerchant) {
    onSelect(merchant);
    setQuery("");
    Keyboard.dismiss();
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={center ? "Search a store or gas station" : "Locating you…"}
        editable={center !== null}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        leftIcon={<Ionicons name="search" size={18} color={t.colors.mutedFg} />}
        rightAccessory={
          query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={t.colors.mutedFg} />
            </Pressable>
          ) : null
        }
      />

      {isActive ? (
        <View style={styles.results}>
          {results.map((m) => (
            <Pressable
              key={m.providerPlaceId}
              onPress={() => handleSelect(m)}
              accessibilityRole="button"
              accessibilityLabel={`Best card for ${m.name}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Text style={styles.emoji}>{categoryEmoji(m.categoryName)}</Text>
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {m.name}
                </Text>
                {m.chainName || m.categoryName ? (
                  <Text style={styles.sub} numberOfLines={1}>
                    {m.chainName ?? m.categoryName}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={t.colors.mutedFg} />
            </Pressable>
          ))}

          {results.length === 0 ? (
            <Text style={styles.empty}>{isSearching ? "Searching…" : "No places found nearby."}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(t: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    wrap: { gap: t.spacing.xs },
    results: { gap: 2 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.spacing.sm,
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md,
      borderRadius: t.radii.lg,
      backgroundColor: t.colors.surface
    },
    pressed: { opacity: 0.7 },
    emoji: { fontSize: 16 },
    text: { flex: 1 },
    name: { fontFamily: t.fontFamily.semibold, fontWeight: "600", color: t.colors.text },
    sub: { fontFamily: t.fontFamily.regular, fontSize: 12, color: t.colors.mutedFg, marginTop: 1 },
    empty: {
      fontFamily: t.fontFamily.regular,
      fontSize: 13,
      color: t.colors.mutedFg,
      paddingVertical: t.spacing.sm,
      paddingHorizontal: t.spacing.md
    }
  });
}
