namespace TrueSpend.Domain.Models.Geo;

public sealed record FoursquareWebhookResult(
    bool Received,
    bool Deduplicated,
    int? NotificationId,
    int? RecommendationId,
    int? MerchantId);
