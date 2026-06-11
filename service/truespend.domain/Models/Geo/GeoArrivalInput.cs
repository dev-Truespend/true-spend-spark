using TrueSpend.Domain.Enums;

namespace TrueSpend.Domain.Models.Geo;

// Provider-neutral arrival the shared handler (GeoArrivalBusiness) consumes. Foursquare and custom
// each map their transport into this; it replaces the Foursquare-shaped FoursquareWebhookInput as the
// handler input. UserId is already resolved (from the validated webhook body on the foursquare path,
// from JWT claims on the custom path) — the handler never trusts a body-supplied identity.
public sealed record GeoArrivalInput(
    string Provider,
    string EventId,
    string EventType,
    GeoArrivalEventKindEnum EventKind,
    Guid? UserId,
    string? ExternalUserId,
    string? PlaceName,
    string? ProviderPlaceId,
    string? GeofenceTag,
    string? PlaceChain,
    decimal? Lat,
    decimal? Lng,
    decimal? AccuracyMeters,
    DateTimeOffset OccurredAt,
    int? DwellSeconds,
    string? MovementState,
    string RawPayload);
