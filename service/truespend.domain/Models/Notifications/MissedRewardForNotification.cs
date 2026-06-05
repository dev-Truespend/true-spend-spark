namespace TrueSpend.Domain.Models.Notifications;

public sealed record MissedRewardForNotification(
    int MissedRewardEventId,
    int TransactionId,
    Guid UserId,
    decimal MissedAmount,
    string? BetterCardName,
    string? CategoryName);
