using TrueSpend.Api.ViewModels.Cards;

namespace TrueSpend.Api.ViewModels.Catalog;

public sealed record CardProductDetailResponseVm(
    CardProductVm Product,
    IReadOnlyList<RewardRuleVm> RewardRules,
    CardTermsVm? Terms);
