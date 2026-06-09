namespace TrueSpend.Domain.Models.Cards;

public sealed record RewardRule(
    string CategoryCode,
    string CategoryName,
    string? CategoryGroup,
    decimal Multiplier,
    string? CapDisplay,
    string? Notes);
