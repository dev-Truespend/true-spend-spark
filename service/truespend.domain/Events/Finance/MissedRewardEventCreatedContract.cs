namespace TrueSpend.Domain.Events.Finance;

public sealed record MissedRewardEventCreatedContract(
    int Version,
    int MissedRewardEventId,
    int TransactionId,
    Guid UserId,
    DateTimeOffset OccurredAt);
