namespace TrueSpend.Api.ViewModels.Cards;

public sealed record RewardRuleVm(string CategoryCode, string CategoryName, string Icon, decimal Multiplier, string? CapDisplay, string? Notes);
