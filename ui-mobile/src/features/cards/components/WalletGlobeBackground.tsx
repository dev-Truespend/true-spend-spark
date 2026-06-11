import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { StyleSheet } from "react-native";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";
import * as Location from "expo-location";

// Purely-visual globe behind the Wallet (Flighty-style). A satellite map renders
// MapKit's 3D globe on iOS; the exposed area is pannable/spinnable. We open on a
// world view, then — once we have a location fix — fly the camera to the user so
// the globe frames where they are ("you are in the US") with the native location
// dot. No markers, no data beyond the OS location indicator.
const WORLD_CAMERA = {
  center: { latitude: 20, longitude: 0 },
  pitch: 0,
  heading: 0,
  altitude: 14_000_000,
  zoom: 0.9
};

// Continental framing once we know where the user is.
const USER_ALTITUDE = 3_500_000;

export type WalletGlobeHandle = { recenter: () => void };

export const WalletGlobeBackground = forwardRef<WalletGlobeHandle>(function WalletGlobeBackground(_props, ref) {
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

  // Imperative handle for the floating "locate me" button. Re-uses the known fix
  // if we have one; otherwise fetches (prompting for permission if needed).
  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (coordsRef.current) flyTo(coordsRef.current);
      else void locateAndFly(true);
    }
  }));

  useEffect(() => {
    void locateAndFly(true);
  }, []);

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
      rotateEnabled
      pitchEnabled={false}
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      showsPointsOfInterest={false}
      toolbarEnabled={false}
    />
  );
});
