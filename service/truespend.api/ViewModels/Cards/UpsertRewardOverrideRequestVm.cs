namespace TrueSpend.Api.ViewModels.Cards;

public sealed record UpsertRewardOverrideRequestVm(string CategoryCode, decimal Multiplier, string? Notes);
