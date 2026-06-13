import { useMemo } from "react";
import type { Region } from "react-native-maps";
import Supercluster from "supercluster";
import type { NearbyMerchant } from "@/features/cards/types/home.types";

// Client-side clustering (pure JS, no native module). The fetched pins live in a fixed 2 km ring around
// the user; as the user zooms out, places that would overlap collapse into a count bubble that splits
// apart on zoom-in — the same behavior Apple/Google Maps use so a dense downtown stays legible.

export type ClusterItem =
  | { kind: "cluster"; key: string; clusterId: number; lat: number; lng: number; count: number }
  | { kind: "leaf"; key: string; merchant: NearbyMerchant };

type MerchantPointProps = { merchant: NearbyMerchant };

// 60px cluster radius is a touch looser than the default (40) so 12mm-ish pills don't visually collide.
const CLUSTER_RADIUS_PX = 60;
const MAX_CLUSTER_ZOOM = 18;

function zoomFromRegion(region: Region): number {
  // MapKit/Maps zoom levels: each level halves the visible longitude span. Clamp to supercluster range.
  const zoom = Math.log2(360 / Math.max(region.longitudeDelta, 1e-6));
  return Math.max(0, Math.min(20, Math.round(zoom)));
}

function bboxFromRegion(region: Region): [number, number, number, number] {
  const west = region.longitude - region.longitudeDelta / 2;
  const east = region.longitude + region.longitudeDelta / 2;
  const south = region.latitude - region.latitudeDelta / 2;
  const north = region.latitude + region.latitudeDelta / 2;
  return [west, south, east, north];
}

export function useClusters(merchants: NearbyMerchant[], region: Region | null) {
  const index = useMemo(() => {
    const sc = new Supercluster<MerchantPointProps>({
      radius: CLUSTER_RADIUS_PX,
      maxZoom: MAX_CLUSTER_ZOOM
    });
    sc.load(
      merchants.map((m) => ({
        type: "Feature" as const,
        properties: { merchant: m },
        geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] }
      }))
    );
    return sc;
  }, [merchants]);

  const clusters = useMemo<ClusterItem[]>(() => {
    if (!region) {
      // No region yet (camera still flying in): render every pin as a leaf — clustering kicks in once
      // the first onRegionChangeComplete reports the real viewport.
      return merchants.map((m) => ({ kind: "leaf", key: m.providerPlaceId, merchant: m }));
    }
    return index.getClusters(bboxFromRegion(region), zoomFromRegion(region)).map((feature) => {
      const [lng, lat] = feature.geometry.coordinates;
      const props = feature.properties;
      if ("cluster" in props && props.cluster) {
        return {
          kind: "cluster",
          key: `cluster-${props.cluster_id}`,
          clusterId: props.cluster_id,
          lat,
          lng,
          count: props.point_count
        };
      }
      const merchant = (props as MerchantPointProps).merchant;
      return { kind: "leaf", key: merchant.providerPlaceId, merchant };
    });
  }, [index, region, merchants]);

  // Zoom level that splits a tapped cluster into its children — used to animate the camera on tap.
  function expansionZoom(clusterId: number): number {
    return Math.min(index.getClusterExpansionZoom(clusterId), 20);
  }

  return { clusters, expansionZoom };
}
