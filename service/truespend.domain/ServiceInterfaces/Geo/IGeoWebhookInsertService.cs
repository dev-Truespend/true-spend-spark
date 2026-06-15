using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.ServiceInterfaces.Geo;

public interface IGeoWebhookInsertService
{
    Task<int> RecordWebhookEventAsync(
        GeoArrivalInput input,
        Guid? userId,
        int? merchantId,
        CancellationToken cancellationToken);

    Task<int> InsertLocationEventAsync(LocationEventEntity entity, CancellationToken cancellationToken);

    Task<int> InsertArrivalDecisionAsync(GeoArrivalDecisionEntity entity, CancellationToken cancellationToken);

    Task<int> InsertAreaSessionAsync(GeoAreaSessionEntity entity, CancellationToken cancellationToken);

    // Closes (expires now) any active area session whose circle covers (lat,lng). Called on an Exit event
    // so a session ends when the user actually leaves the area, instead of waiting out its TTL. Returns
    // the number of sessions closed.
    Task<int> ExpireCoveringAreaSessionsAsync(Guid userId, decimal lat, decimal lng, DateTimeOffset now, CancellationToken cancellationToken);

    Task<int> InsertNotificationAsync(NotificationEntity entity, CancellationToken cancellationToken);

    Task UpdateNotificationPayloadAsync(int notificationId, string payload, CancellationToken cancellationToken);

    Task MarkWebhookProcessedAsync(int webhookEventId, Guid? userId, int? merchantId, string? processingError, CancellationToken cancellationToken);
}
