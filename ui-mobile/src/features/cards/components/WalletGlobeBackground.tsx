import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type Region } from "react-native-maps";
import * as Location from "expo-location";
import type { NearbyMerchant } from "@/features/cards/types/home.types";
import type { NearbyMerchantsInput } from "@/features/cards/api/home.api";

// Map-centric home: a satellite map (MapKit's 3D globe on iOS) framed on the user, with up to ~30
// rewardable merchant pins. We open on a world view, fly to the user once we have a fix, then emit the
// visible viewport so the screen can load pins for it; panning/zooming re-emits and re-queries.
const WORLD_CAMERA = {
  center: { latitude: 20, longitude: 0 },
  pitch: 0,
  heading: 0,
  altitude: 14_000_000,
  zoom: 0.9
};

// Framing once we know where the user is — close enough that nearby pins are legible.
const USER_ALTITUDE = 12_000;
const NEARBY_PIN_LIMIT = 30;

export type WalletGlobeHandle = { recenter: () => void };

type Props = {
  merchants?: NearbyMerchant[];
  onSelectMerchant?: (merchant: NearbyMerchant) => void;
  onViewportChange?: (viewport: NearbyMerchantsInput) => void;
};

export const WalletGlobeBackground = forwardRef<WalletGlobeHandle, Props>(function WalletGlobeBackground(
  { merchants = [], onSelectMerchant, onViewportChange },
  ref
) {
  const mapRef = useRef<MapView>(null);
  const coordsRef = useRef<{ latitude: number; longitude: number } | null>(null);

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
      flyTo(coordsRef.current);
    } catch {
      // Permission denied or location unavailable — keep the current view.
    }
  }

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (coordsRef.current) flyTo(coordsRef.current);
      else void locateAndFly(true);
    }
  }));

  useEffect(() => {
    void locateAndFly(true);
  }, []);

  // On pan/zoom end, report the visible bbox + centre so the screen can fetch pins for the viewport.
  async function handleRegionChangeComplete(region: Region) {
    if (!onViewportChange) return;
    try {
      const bounds = await mapRef.current?.getMapBoundaries();
      if (!bounds) return;
      onViewportChange({
        swLat: bounds.southWest.latitude,
        swLng: bounds.southWest.longitude,
        neLat: bounds.northEast.latitude,
        neLng: bounds.northEast.longitude,
        centerLat: region.latitude,
        centerLng: region.longitude,
        limit: NEARBY_PIN_LIMIT
      });
    } catch {
      // Boundaries unavailable mid-animation — the next settle re-emits.
    }
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
      {merchants.map((m) => (
        <Marker
          key={m.providerPlaceId}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          title={m.name}
          description={m.categoryName ?? undefined}
          onPress={() => onSelectMerchant?.(m)}
        />
      ))}
    </MapView>
  );
});
