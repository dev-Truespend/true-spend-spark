using TrueSpend.Api.ViewModels.Catalog;

namespace TrueSpend.Api.ViewModels.Merchants;

public sealed record MerchantVm(
    int Id,
    string Name,
    string CategoryCode,
    bool IsMultiCategory,
    string? Address)
{
    // The categories the picker should offer for a multi-category merchant; empty for single-category
    // merchants. Init property so the existing positional constructors stay unchanged.
    public IReadOnlyList<CategoryVm> CategoryOptions { get; init; } = [];
}
