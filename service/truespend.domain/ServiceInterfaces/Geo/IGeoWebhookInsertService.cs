using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IGeoWebhookInsertService
{
    Task<int> RecordWebhookEventAsync(
        FoursquareWebhookInput input,
        Guid? userId,
        int? merchantId,
        CancellationToken cancellationToken);

    Task<int> InsertLocationEventAsync(LocationEventEntity entity, CancellationToken cancellationToken);

    Task<int> InsertNotificationAsync(NotificationEntity entity, CancellationToken cancellationToken);

    Task UpdateNotificationPayloadAsync(int notificationId, string payload, CancellationToken cancellationToken);

    Task MarkWebhookProcessedAsync(int webhookEventId, Guid? userId, int? merchantId, string? processingError, CancellationToken cancellationToken);
}
