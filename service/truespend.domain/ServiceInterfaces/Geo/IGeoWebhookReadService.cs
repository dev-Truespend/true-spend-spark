namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IGeoWebhookReadService
{
    Task<bool> WebhookEventExistsAsync(string foursquareEventId, CancellationToken cancellationToken);

    Task<Guid?> ResolveUserIdAsync(string externalUserId, CancellationToken cancellationToken);

    Task<short> GetNotificationTypeIdAsync(string code, CancellationToken cancellationToken);

    Task<bool> HasActiveCardsAsync(Guid userId, CancellationToken cancellationToken);

    // Count geo-arrival recommendations generated for the user at or after `since` (UTC), used to
    // enforce the per-plan geo_recommendations_per_day cap.
    Task<int> CountGeoRecommendationsSinceAsync(Guid userId, DateTimeOffset since, CancellationToken cancellationToken);

    Task<short> GetLocationEventTypeIdAsync(string code, CancellationToken cancellationToken);
}
