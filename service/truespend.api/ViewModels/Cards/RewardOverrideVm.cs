namespace TrueSpend.Api.ViewModels.Cards;

public sealed record RewardOverrideVm(string CategoryCode, string CategoryName, decimal Multiplier, string? Notes);
