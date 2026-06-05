namespace TrueSpend.Domain.Events.Cards;

public sealed record RewardOverrideEventContract(
    int UserCardId,
    Guid UserId,
    string CategoryCode,
    decimal? Multiplier,
    DateTimeOffset OccurredAt);
