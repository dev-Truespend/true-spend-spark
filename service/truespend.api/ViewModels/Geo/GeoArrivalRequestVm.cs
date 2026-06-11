namespace TrueSpend.Api.ViewModels.Geo;

// Custom-arrival ingress body (10a). Carries NO user identity — the server derives userId from the
// JWT claims and ignores any identifier a device might assert. eventId is a stable per-stop key so
// background retries dedup instead of re-notifying. matchConfidence is the device's own score; the
// server re-scores with its own signals and makes the final call.
public sealed class GeoArrivalRequestVm
{
    public string EventId { get; set; } = string.Empty;
    public string EventType { get; set; } = "arrival";
    public string? PlaceName { get; set; }
    public string? ProviderPlaceId { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public decimal? AccuracyMeters { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public decimal? MatchConfidence { get; set; }
    public int? DwellSeconds { get; set; }
    public string? MovementState { get; set; }
}
