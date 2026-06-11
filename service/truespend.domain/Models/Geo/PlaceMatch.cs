using TrueSpend.Domain.Enums;

namespace TrueSpend.Domain.Models.Geo;

// Outcome of resolving an arrival coordinate to a known place. Tier drives the action:
// High -> push, Medium -> foreground nearby list (no push), Low/None -> log only.
public sealed record PlaceMatch(
    bool HasCandidate,
    string? Name,
    string? Provider,
    string? ProviderPlaceId,
    ArrivalConfidenceTierEnum Tier);
