namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IGeoWebhookReadService
{
    Task<bool> WebhookEventExistsAsync(string foursquareEventId, CancellationToken cancellationToken);

    Task<Guid?> ResolveUserIdAsync(string externalUserId, CancellationToken cancellationToken);

    Task<short> GetNotificationTypeIdAsync(string code, CancellationToken cancellationToken);

    Task<bool> HasActiveCardsAsync(Guid userId, CancellationToken cancellationToken);

    Task<short> GetLocationEventTypeIdAsync(string code, CancellationToken cancellationToken);
}
