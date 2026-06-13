namespace TrueSpend.Api.ViewModels.Merchants;

public sealed record RecentVisitVm(
    MerchantVm Merchant,
    string CategoryCode,
    DateTimeOffset VisitedAt);
