using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.NotificationSettings;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationDispatchService
{
    Task<NotificationDispatchInput?> GetDispatchInputAsync(int notificationId, CancellationToken cancellationToken);
    Task<NotificationDeliveryPreference?> GetPreferenceAsync(Guid userId, CancellationToken cancellationToken);
    Task<string?> GetUserTimezoneAsync(Guid userId, CancellationToken cancellationToken);
    Task<IReadOnlyList<PushTarget>> GetActivePushTargetsAsync(Guid userId, CancellationToken cancellationToken);
    Task<string?> GetUserEmailAsync(Guid userId, CancellationToken cancellationToken);
    Task<short> GetChannelIdAsync(string channelCode, CancellationToken cancellationToken);
    Task<short> GetDeliveryStatusIdAsync(string statusCode, CancellationToken cancellationToken);
    Task InsertDeliveryAsync(int notificationId, int? deviceId, short channelId, short statusId, string? externalId, string? errorCode, string? errorMessage, CancellationToken cancellationToken);
}
