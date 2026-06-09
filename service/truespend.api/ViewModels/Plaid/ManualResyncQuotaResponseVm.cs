namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record ManualResyncQuotaResponseVm(
    bool IsPro,
    int Limit,
    int Used,
    int Remaining);
