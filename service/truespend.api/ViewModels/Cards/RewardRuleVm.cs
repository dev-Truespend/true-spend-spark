namespace TrueSpend.Api.ViewModels.Cards;

public sealed record RewardRuleVm(string CategoryCode, string CategoryName, decimal Multiplier, string? CapDisplay, string? Notes);
