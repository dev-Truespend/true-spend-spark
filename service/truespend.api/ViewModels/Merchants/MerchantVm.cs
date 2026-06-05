namespace TrueSpend.Api.ViewModels.Merchants;

public sealed record MerchantVm(
    int Id,
    string Name,
    string CategoryCode,
    bool IsMultiCategory,
    string? Address);
