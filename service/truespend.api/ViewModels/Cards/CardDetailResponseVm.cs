using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Cards;

public sealed record CardDetailResponseVm(
    CardSummaryVm Card,
    IReadOnlyList<RewardRuleVm> RewardRules,
    MonthlyRewardContributionVm? MonthlyRewardContribution,
    CardTermsVm? Terms);
