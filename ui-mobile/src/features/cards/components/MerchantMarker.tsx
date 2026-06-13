import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";
import type { NearbyMerchant } from "@/features/cards/types/home.types";
import { categoryEmoji } from "@/features/cards/utils/categoryEmoji";

function shortName(name: string): string {
  return name.length > 14 ? `${name.slice(0, 13)}…` : name;
}

type Props = {
  merchant: NearbyMerchant;
  selected: boolean;
  onPress: (merchant: NearbyMerchant) => void;
};

export function MerchantMarker({ merchant, selected, onPress }: Props) {
  // react-native-maps only repaints the custom marker view while tracksViewChanges is true. Keep it on
  // briefly (initial paint + whenever selection flips), then off so 30 markers don't redraw every frame.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(t);
  }, [selected]);

  return (
    <Marker
      coordinate={{ latitude: merchant.lat, longitude: merchant.lng }}
      onPress={() => onPress(merchant)}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 1 }}
    >
      <View style={styles.wrap}>
        <View style={[styles.pill, selected && styles.pillSelected]}>
          <Text style={styles.emoji}>{categoryEmoji(merchant.categoryName)}</Text>
          <Text style={[styles.name, selected && styles.nameSelected]} numberOfLines={1}>
            {shortName(merchant.name)}
          </Text>
        </View>
        <View style={[styles.stem, selected && styles.stemSelected]} />
      </View>
    </Marker>
  );
}

const GLASS_BG = "rgba(18, 22, 30, 0.62)";
const GLASS_BORDER = "rgba(255, 255, 255, 0.22)";
const ACCENT = "#60A5FA";

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 150,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: GLASS_BG,
    borderWidth: 1,
    borderColor: GLASS_BORDER
  },
  pillSelected: {
    borderColor: ACCENT,
    backgroundColor: "rgba(37, 99, 235, 0.85)",
    transform: [{ scale: 1.06 }],
    // Colored glow on selection.
    shadowColor: ACCENT,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8
  },
  emoji: { fontSize: 13 },
  name: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  nameSelected: { color: "#FFFFFF" },
  stem: {
    width: 2,
    height: 8,
    backgroundColor: GLASS_BORDER,
    marginTop: -1
  },
  stemSelected: { backgroundColor: ACCENT, height: 10 }
});
