namespace TrueSpend.Domain.Models.Cards;

public sealed record RewardOverride(
    string CategoryCode,
    string CategoryName,
    decimal Multiplier,
    string? Notes);
