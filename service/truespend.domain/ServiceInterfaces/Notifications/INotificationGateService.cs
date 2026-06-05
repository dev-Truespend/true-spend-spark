using TrueSpend.Domain.Models.Notifications;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationGateService
{
    Task<NotificationGate> GetGateAsync(Guid userId, short notificationTypeId, DateTimeOffset now, CancellationToken cancellationToken);
}
