namespace TrueSpend.Domain.Models.Notifications;

public sealed record NotificationToProduce(
    Guid UserId,
    short NotificationTypeId,
    string Title,
    string Body,
    int? RelatedTransactionId,
    int? RelatedMissedRewardEventId,
    string? Payload);
