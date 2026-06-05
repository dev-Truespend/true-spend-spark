using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Catalog;

public sealed record CardProductDetailResponse(
    CardProduct Product,
    IReadOnlyList<RewardRule> RewardRules,
    CardTerms? Terms);
