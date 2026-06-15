using TrueSpend.Domain.Enums;

namespace TrueSpend.Domain.Models.Geo;

// Outcome of resolving an arrival coordinate to a known place. Tier drives the action:
// High -> push, Medium -> foreground nearby list (no push), Low/None -> log only.
// CandidateCount/PlausibleCount feed arrival decision telemetry: how many places were in the search
// radius vs. within the proximity radius (the density signal behind the tier). Default 0 for the
// geofence path, which trusts the provider and does no coordinate ranking.
public sealed record PlaceMatch(
    bool HasCandidate,
    string? Name,
    string? Provider,
    string? ProviderPlaceId,
    ArrivalConfidenceTierEnum Tier,
    int CandidateCount = 0,
    int PlausibleCount = 0,
    ArrivalDecisionModeEnum Mode = ArrivalDecisionModeEnum.Unknown,
    IReadOnlyList<PlaceMatchCandidate>? TopCandidates = null);

// A ranked plausible candidate, surfaced for the grouped/area push (mode AreaCluster / MallArea) so the
// handler can resolve each store and build a per-store best card. Empty on the trusted geofence path.
public sealed record PlaceMatchCandidate(
    string Name,
    string Provider,
    string? ProviderPlaceId,
    string? CategoryCode,
    double DistanceMeters);
