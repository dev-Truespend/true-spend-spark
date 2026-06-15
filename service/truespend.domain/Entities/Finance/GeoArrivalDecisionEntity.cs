namespace TrueSpend.Domain.Entities.Finance;

// One row per resolved arrival: what tier/mode we decided, how crowded the stop was, and the outcome.
// Telemetry for tuning the confidence thresholds (proximity/margin/dwell/density) from real data.
public sealed class GeoArrivalDecisionEntity
{
    public int Id { get; set; }
    public int WebhookEventId { get; set; }
    public Guid UserId { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string EventId { get; set; } = string.Empty;
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public decimal? AccuracyMeters { get; set; }
    public int? DwellSeconds { get; set; }
    public string? MovementState { get; set; }
    public short ConfidenceTier { get; set; }
    public int CandidateCount { get; set; }
    public int PlausibleCount { get; set; }
    public int? ChosenMerchantId { get; set; }
    public string? DecisionMode { get; set; }
    public string DecisionOutcome { get; set; } = string.Empty;
    public bool NotificationProduced { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
