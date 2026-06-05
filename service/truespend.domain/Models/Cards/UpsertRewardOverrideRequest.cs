namespace TrueSpend.Domain.Models.Cards;

public sealed record UpsertRewardOverrideRequest(string CategoryCode, decimal Multiplier, string? Notes);
