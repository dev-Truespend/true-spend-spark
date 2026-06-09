using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Recommendations;

public sealed record UserCardReward(
    CardSummary Card,
    int? CardProductId,
    decimal BaseRate,
    IReadOnlyDictionary<string, decimal> RatesByCategory,
    string RewardCurrencyCode,
    IReadOnlyList<MerchantLockedRate> MerchantLockedRates);

// A brand/merchant-locked bonus (e.g. 12x at Hilton). Applies only when the transaction's
// merchant matches MerchantBrand — kept out of RatesByCategory so it can't over-credit generically.
public sealed record MerchantLockedRate(
    string CategoryCode,
    decimal Rate,
    string? MerchantBrand);
