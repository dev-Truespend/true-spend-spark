namespace TrueSpend.Domain.Models.Cards;

public sealed record RewardRule(
    string CategoryCode,
    string CategoryName,
    decimal Multiplier,
    string? CapDisplay,
    string? Notes);
