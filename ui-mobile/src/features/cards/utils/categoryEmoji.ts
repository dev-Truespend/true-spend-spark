// Category glyph for pins, cluster leaves, and search results. Matched on the human display name
// (e.g. "Gas Stations", "Dining"), never the opaque rcc_ code. Falls back to a generic pin.
export function categoryEmoji(name?: string | null): string {
  const n = (name ?? "").toLowerCase();
  if (n.includes("gas") || n.includes("fuel")) return "⛽️";
  if (n.includes("coffee")) return "☕️";
  if (n.includes("din") || n.includes("restaurant") || n.includes("food")) return "🍽️";
  if (n.includes("grocer") || n.includes("supermarket")) return "🛒";
  if (n.includes("pharmac") || n.includes("drug")) return "💊";
  if (n.includes("hotel") || n.includes("lodging")) return "🏨";
  if (n.includes("transit") || n.includes("transport") || n.includes("train") || n.includes("airport")) return "🚆";
  if (n.includes("entertain") || n.includes("movie") || n.includes("theat")) return "🎬";
  if (n.includes("department") || n.includes("big box") || n.includes("retail") || n.includes("club") || n.includes("store"))
    return "🛍️";
  return "📍";
}
