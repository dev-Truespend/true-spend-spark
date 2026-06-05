namespace TrueSpend.Api.ViewModels.Cards;

public sealed record CardLimitsResponseVm(
    int PlaidUsed,
    int? PlaidLimit,
    int ManualUsed,
    int? ManualLimit,
    bool Unlimited);
