// Jest can't load the native map module; tests don't render the map. Provide
// minimal stubs covering what MapScreen imports.
import { View } from "react-native";

const MapView = (props: { children?: React.ReactNode }) => <View>{props.children}</View>;

export const Marker = (props: { children?: React.ReactNode }) => <View>{props.children}</View>;
export const PROVIDER_DEFAULT = undefined;
export const PROVIDER_GOOGLE = "google";
export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export default MapView;
