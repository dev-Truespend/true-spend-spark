using TrueSpend.Domain.Models.Notifications;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationGateService
{
    Task<NotificationGate> GetGateAsync(Guid userId, short notificationTypeId, DateTimeOffset now, CancellationToken cancellationToken);

    // Batched gate resolution for one notification type across many users. Issues a fixed number of
    // queries regardless of user count (one per preference table) instead of one set per user.
    // Callers that gate over a per-user collection should use this to avoid an N+1 query pattern.
    Task<IReadOnlyDictionary<Guid, NotificationGate>> GetGatesAsync(
        IReadOnlyCollection<Guid> userIds, short notificationTypeId, DateTimeOffset now, CancellationToken cancellationToken);
}
