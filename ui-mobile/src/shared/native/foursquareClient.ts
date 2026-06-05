import { env } from "@/shared/config/env";

export type FoursquarePlace = {
  fsq_id: string;
  name: string;
  location?: {
    address?: string;
    locality?: string;
    region?: string;
  };
  categories?: { name: string }[];
  geocodes?: { main?: { latitude: number; longitude: number } };
};

export type FoursquareSearchInput = {
  query: string;
  near?: string;
  ll?: { lat: number; lng: number };
  limit?: number;
};

const BASE_URL = "https://api.foursquare.com/v3/places/search";

export async function searchFoursquarePlaces(input: FoursquareSearchInput): Promise<FoursquarePlace[]> {
  if (!env.foursquareApiKey) {
    return placeholderPlaces(input);
  }
  const params = new URLSearchParams({
    query: input.query.trim(),
    limit: String(input.limit ?? 5)
  });
  if (input.ll) {
    params.set("ll", `${input.ll.lat},${input.ll.lng}`);
  } else if (input.near) {
    params.set("near", input.near);
  }

  const response = await fetch(`${BASE_URL}?${params.toString()}`, {
    headers: {
      accept: "application/json",
      Authorization: env.foursquareApiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Foursquare search failed with status ${response.status}`);
  }
  const body = (await response.json()) as { results?: FoursquarePlace[] };
  return body.results ?? [];
}

function placeholderPlaces(input: FoursquareSearchInput): FoursquarePlace[] {
  const limit = input.limit ?? 5;
  const query = input.query.trim() || "Nearby Market";
  const base: FoursquarePlace[] = [
    {
      fsq_id: `placeholder-${slug(query)}-1`,
      name: query,
      location: { address: "100 Market St", locality: "San Francisco", region: "CA" },
      categories: [{ name: "Grocery Store" }],
      geocodes: { main: { latitude: input.ll?.lat ?? 37.7749, longitude: input.ll?.lng ?? -122.4194 } }
    },
    {
      fsq_id: `placeholder-${slug(query)}-2`,
      name: `${query} Express`,
      location: { address: "200 Mission St", locality: "San Francisco", region: "CA" },
      categories: [{ name: "Convenience Store" }],
      geocodes: { main: { latitude: input.ll?.lat ?? 37.7896, longitude: input.ll?.lng ?? -122.3978 } }
    }
  ];
  return base.slice(0, limit);
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/(^-|-$)/gu, "") || "place";
}
