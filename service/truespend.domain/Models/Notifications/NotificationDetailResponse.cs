using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.Models.Notifications;

public sealed record NotificationDetailResponse(
    Notification Notification,
    TransactionDetail? RelatedTransaction,
    MissedReward? RelatedMissedReward);
