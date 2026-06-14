namespace TrueSpend.Domain.Models.Recommendations;

// CategoryCodes is the full set of catalog categories the merchant name spans (alias substring matches),
// primary first. IsMultiCategory is just CategoryCodes.Count > 1, kept for the persisted merchant flag.
public sealed record MerchantCategoryMatch(string CategoryCode, bool IsMultiCategory, IReadOnlyList<string> CategoryCodes);
