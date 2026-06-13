import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

// A count bubble standing in for several overlapping merchant pins. Tapping it zooms the map in until
// the cluster splits apart. Styled to match MerchantMarker's glass look so the two read as one family.
type Props = {
  clusterId: number;
  lat: number;
  lng: number;
  count: number;
  onPress: (clusterId: number, coord: { latitude: number; longitude: number }) => void;
};

export function ClusterMarker({ clusterId, lat, lng, count, onPress }: Props) {
  // react-native-maps only repaints custom marker views while tracksViewChanges is true. Keep it on
  // briefly for the initial paint, then off so a screenful of bubbles doesn't redraw every frame.
  const [tracks, setTracks] = useState(true);
  useEffect(() => {
    setTracks(true);
    const t = setTimeout(() => setTracks(false), 600);
    return () => clearTimeout(t);
  }, [count]);

  // Larger bubble for denser clusters, capped so it never dominates the map.
  const size = count >= 50 ? 52 : count >= 10 ? 46 : 40;
  const label = count > 99 ? "99+" : `${count}`;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lng }}
      onPress={() => onPress(clusterId, { latitude: lat, longitude: lng })}
      tracksViewChanges={tracks}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.count}>{label}</Text>
      </View>
    </Marker>
  );
}

const ACCENT = "#60A5FA";

const styles = StyleSheet.create({
  bubble: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(37, 99, 235, 0.82)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.7)",
    shadowColor: ACCENT,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6
  },
  count: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" }
});
