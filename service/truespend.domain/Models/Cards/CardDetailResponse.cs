namespace TrueSpend.Domain.Models.Cards;

public sealed record CardDetailResponse(
    CardSummary Card,
    IReadOnlyList<RewardRule> RewardRules,
    MonthlyRewardContribution? MonthlyRewardContribution,
    CardTerms? Terms);
