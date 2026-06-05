using TrueSpend.Api.ViewModels.Transactions;

namespace TrueSpend.Api.ViewModels.Notifications;

public sealed record NotificationDetailResponseVm(
    NotificationVm Notification,
    RelatedTransactionVm? RelatedTransaction,
    MissedRewardVm? RelatedMissedReward);
