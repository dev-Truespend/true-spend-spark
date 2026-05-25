/**
 * Google Maps Integration — COMING IN 2-4 WEEKS
 *
 * Planned features:
 *  - Merchant location display on spend map
 *  - Directions from current location to favourite merchants
 *  - Address autocomplete in receipt capture / manual entry
 *  - Geocoding for transaction lat/lon → human-readable address
 *
 * Note: The location feature currently uses Leaflet + OpenStreetMap for
 * the geofencing heatmap. Google Maps will complement this for the
 * merchant discovery experience.
 *
 * Setup steps when ready:
 *  1. Enable Maps JavaScript API, Places API, Geocoding API in GCP console
 *  2. Add VITE_GOOGLE_MAPS_API_KEY to .env.example
 *  3. Install: npm install @vis.gl/react-google-maps
 *  4. Wrap app or relevant feature in <APIProvider apiKey={...}>
 */

// TODO: replace with real Google Maps loader once API key is configured
export const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Placeholder until Google Maps is wired — returns the raw coords unchanged. */
export async function geocodeAddress(_address: string): Promise<Coordinates | null> {
  // TODO: implement using Maps Geocoding API
  return null;
}

/** Returns a Google Maps directions URL that opens in browser/app. */
export function getMerchantDirectionsUrl(destination: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
}
