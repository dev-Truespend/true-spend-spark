import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import MapView, { Circle, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import * as Location from "expo-location";
import type { NearbyMerchant } from "@/features/cards/types/home.types";
import { MerchantMarker } from "@/features/cards/components/MerchantMarker";
import { ClusterMarker } from "@/features/cards/components/ClusterMarker";
import { useClusters } from "@/features/cards/hooks/useClusters";

// Matches the hook's NEARBY_RADIUS_METERS — the ring shows the 2 km area pins are drawn from.
const RADIUS_RING_METERS = 2000;

// Map-centric home: a satellite map (MapKit's 3D globe on iOS) framed on the user. Pins are anchored to
// the user's location (fetched by radius elsewhere) and only render when the map is zoomed in around
// them — zoom out past the radius and the pins hide, leaving just the map.
const WORLD_CAMERA = {
  center: { latitude: 20, longitude: 0 },
  pitch: 0,
  heading: 0,
  altitude: 14_000_000,
  zoom: 0.9
};

// Framing once we know where the user is — close enough that nearby pins are legible.
const USER_ALTITUDE = 12_000;
// Pins show only when the visible span is roughly within the search radius (~9 km). Zoom out past this
// and we hide them and show just the map — "only around the user's location, nothing when zoomed out".
const PIN_VISIBLE_MAX_LAT_DELTA = 0.08;

export type WalletGlobeHandle = {
  recenter: () => void;
  // Fly to an arbitrary coordinate (e.g. a search result outside the pin radius).
  focusOn: (lat: number, lng: number) => void;
};

type Props = {
  merchants?: NearbyMerchant[];
  onSelectMerchant?: (merchant: NearbyMerchant) => void;
  onUserLocated?: (center: { lat: number; lng: number }) => void;
  // Pins + radius ring are a Basic+ feature. When false (Free tier), the map shows alone — no pins,
  // no ring. The screen also skips the nearby fetch so no merchants ever arrive here.
  showPins?: boolean;
};

export const WalletGlobeBackground = forwardRef<WalletGlobeHandle, Props>(function WalletGlobeBackground(
  { merchants = [], onSelectMerchant, onUserLocated, showPins = true },
  ref
) {
  const mapRef = useRef<MapView>(null);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [pinsVisible, setPinsVisible] = useState(true);
  const [userCenter, setUserCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region | null>(null);

  const { clusters, expansionZoom } = useClusters(merchants, region);

  function flyTo(coords: { latitude: number; longitude: number }) {
    mapRef.current?.animateCamera(
      { center: coords, altitude: USER_ALTITUDE, pitch: 0, heading: 0 },
      { duration: 1600 }
    );
  }

  async function locateAndFly(prompt: boolean) {
    try {
      const perm = prompt
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") return;
      const pos =
        (await Location.getLastKnownPositionAsync()) ??
        (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }));
      if (!pos) return;
      coordsRef.current = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      setUserCenter(coordsRef.current);
      onUserLocated?.({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      flyTo(coordsRef.current);
    } catch {
      // Permission denied or location unavailable — keep the current view.
    }
  }

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (coordsRef.current) flyTo(coordsRef.current);
      else void locateAndFly(true);
    },
    focusOn: (lat: number, lng: number) => flyTo({ latitude: lat, longitude: lng })
  }));

  useEffect(() => {
    void locateAndFly(true);
  }, []);

  // Pins are user-anchored, not viewport-driven: panning never refetches. We track the region to
  // re-cluster, and hide pins entirely once zoomed out past the radius so the map is clean.
  function handleRegionChangeComplete(next: Region) {
    setRegion(next);
    setPinsVisible(next.latitudeDelta <= PIN_VISIBLE_MAX_LAT_DELTA);
  }

  // Tapping a cluster zooms in until it splits into its children.
  function handleClusterPress(clusterId: number, coord: { latitude: number; longitude: number }) {
    const zoom = expansionZoom(clusterId);
    const longitudeDelta = 360 / 2 ** zoom;
    mapRef.current?.animateToRegion(
      { latitude: coord.latitude, longitude: coord.longitude, latitudeDelta: longitudeDelta, longitudeDelta },
      450
    );
  }

  return (
    <MapView
      ref={mapRef}
      provider={PROVIDER_DEFAULT}
      style={StyleSheet.absoluteFill}
      mapType="satellite"
      initialCamera={WORLD_CAMERA}
      onMapReady={() => {
        if (coordsRef.current) flyTo(coordsRef.current);
      }}
      onRegionChangeComplete={handleRegionChangeComplete}
      rotateEnabled
      pitchEnabled={false}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterest={false}
      toolbarEnabled={false}
    >
      {showPins && pinsVisible && userCenter ? (
        <Circle
          center={userCenter}
          radius={RADIUS_RING_METERS}
          strokeColor="rgba(96, 165, 250, 0.5)"
          fillColor="rgba(96, 165, 250, 0.08)"
          strokeWidth={1}
        />
      ) : null}

      {showPins &&
        pinsVisible &&
        clusters.map((item) =>
          item.kind === "cluster" ? (
            <ClusterMarker
              key={item.key}
              clusterId={item.clusterId}
              lat={item.lat}
              lng={item.lng}
              count={item.count}
              onPress={handleClusterPress}
            />
          ) : (
            <MerchantMarker
              key={item.key}
              merchant={item.merchant}
              selected={selectedId === item.merchant.providerPlaceId}
              onPress={(picked) => {
                setSelectedId(picked.providerPlaceId);
                onSelectMerchant?.(picked);
              }}
            />
          )
        )}
    </MapView>
  );
});
