using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.Models.Notifications;

public sealed class NotificationDetail
{
    public required Notification Notification { get; init; }
    public TransactionDetail? RelatedTransaction { get; init; }
    public MissedReward? RelatedMissedReward { get; init; }
}
