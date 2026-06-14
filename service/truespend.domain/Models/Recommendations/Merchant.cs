namespace TrueSpend.Domain.Models.Recommendations;

public sealed record Merchant(int Id, string Name, string CategoryCode, bool IsMultiCategory, string? Address)
{
    // The categories this merchant plausibly spans, for the "what are you buying?" picker. Populated only
    // for multi-category merchants at recommendation-build time; empty otherwise. Init property (not a
    // positional param) so the many Merchant constructors that don't carry it stay unchanged.
    public IReadOnlyList<Category> CategoryOptions { get; init; } = [];
}
