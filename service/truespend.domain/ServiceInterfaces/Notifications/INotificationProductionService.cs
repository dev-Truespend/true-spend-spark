using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.NotificationSettings;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface INotificationProductionService
{
    Task<IReadOnlyList<NotificationReminder>> GetDueRemindersAsync(DateTimeOffset now, CancellationToken cancellationToken);
    Task<Dictionary<Guid, NotificationDeliveryPreference>> GetPreferencesAsync(IReadOnlyList<Guid> userIds, CancellationToken cancellationToken);
    Task<short> GetSystemNotificationTypeIdAsync(CancellationToken cancellationToken);
    Task<Dictionary<int, short>> GetSourceNotificationTypeIdsAsync(IReadOnlyList<int> sourceNotificationIds, CancellationToken cancellationToken);
    Task<Dictionary<int, SourceNotificationInfo>> GetSourceNotificationsAsync(IReadOnlyList<int> sourceNotificationIds, CancellationToken cancellationToken);
    Task<int> InsertNotificationAsync(NotificationToProduce input, CancellationToken cancellationToken);
    Task UpdateNotificationPayloadAsync(int notificationId, string payload, CancellationToken cancellationToken);
    Task MarkReminderFiredAsync(int reminderId, DateTimeOffset firedAt, CancellationToken cancellationToken);
    Task<short> GetNotificationTypeIdAsync(string typeCode, CancellationToken cancellationToken);
    Task<MissedRewardForNotification?> GetMissedRewardForNotificationAsync(int missedRewardEventId, CancellationToken cancellationToken);
    Task<bool> HasExistingMissedRewardNotificationAsync(int missedRewardEventId, CancellationToken cancellationToken);
    Task<IReadOnlyList<EligibleSummaryUser>> GetActiveUsersWithTimezoneAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<UnusualTransactionCandidate>> GetUnusualTransactionCandidatesAsync(DateTimeOffset since, decimal thresholdAmount, CancellationToken cancellationToken);
}
