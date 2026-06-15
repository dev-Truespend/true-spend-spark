namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IGeoWebhookReadService
{
    // Idempotency check keyed on (provider, eventId) — shared by the foursquare webhook and the
    // custom device ingress (10a). The custom eventId is a stable per-stop key, not a fresh GUID.
    Task<bool> WebhookEventExistsAsync(string provider, string eventId, CancellationToken cancellationToken);

    Task<Guid?> ResolveUserIdAsync(string externalUserId, CancellationToken cancellationToken);

    Task<short> GetNotificationTypeIdAsync(string code, CancellationToken cancellationToken);

    Task<bool> HasActiveCardsAsync(Guid userId, CancellationToken cancellationToken);

    // Count geo-arrival recommendations generated for the user at or after `since` (UTC), used to
    // enforce the per-plan geo_recommendations_per_day cap.
    Task<int> CountGeoRecommendationsSinceAsync(Guid userId, DateTimeOffset since, CancellationToken cancellationToken);

    Task<short> GetLocationEventTypeIdAsync(string code, CancellationToken cancellationToken);

    // Returns an active (non-expired) area session whose circle covers (lat,lng), else null. Used to
    // suppress per-store pushes while the user is inside a mall/plaza/cluster or a personal place.
    Task<bool> HasCoveringAreaSessionAsync(Guid userId, decimal lat, decimal lng, DateTimeOffset now, CancellationToken cancellationToken);

    // True when (lat,lng) falls inside one of the user's recurring dwell zones (home/work) — used to
    // suppress best-card pushes while the user is simply at a personal place near stores.
    Task<bool> IsWithinPersonalPlaceAsync(Guid userId, decimal lat, decimal lng, CancellationToken cancellationToken);
}
