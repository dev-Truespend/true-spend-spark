namespace TrueSpend.Domain.Models.Geo;

public sealed record FoursquareWebhookInput(
    string FoursquareEventId,
    string EventType,
    string? ExternalUserId,
    string? PlaceChain,
    string? PlaceName,
    string? GeofenceTag,
    decimal? Lat,
    decimal? Lng,
    decimal? AccuracyMeters,
    DateTimeOffset OccurredAt,
    string RawPayload);
