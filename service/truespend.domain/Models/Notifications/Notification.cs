namespace TrueSpend.Domain.Models.Notifications;

public sealed class Notification
{
    public int Id { get; init; }
    public string TypeCode { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Body { get; init; } = string.Empty;
    public bool IsRead { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public int? RelatedTransactionId { get; init; }
    public int? RelatedMissedRewardEventId { get; init; }
}
