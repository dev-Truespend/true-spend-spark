namespace TrueSpend.Domain.Models.Geo;

// A single recorded location fix, used by personal-place detection to cluster recurring dwell zones.
// OccurredAt feeds the distinct-day recurrence test (a real home/work recurs across many days).
public readonly record struct LocationPoint(decimal Lat, decimal Lng, DateTimeOffset OccurredAt);
