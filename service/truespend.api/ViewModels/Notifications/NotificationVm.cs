namespace TrueSpend.Api.ViewModels.Notifications;

public sealed record NotificationVm(
    int Id,
    string TypeCode,
    string Title,
    string Body,
    bool IsRead,
    DateTimeOffset CreatedAt,
    int? RelatedTransactionId,
    int? RelatedMissedRewardEventId);
