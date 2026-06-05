using TrueSpend.Api.ViewModels.Analytics;
using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Domain.Models.Analytics;

namespace TrueSpend.Api.Mappers;

public interface IAnalyticsMapper
{
    AnalyticsPeriodRequest ToDomain(string periodCode);
    RewardsSummaryResponseVm ToRewardsSummary(RewardsSummaryResponse domain);
    MissedRewardsSummaryResponseVm ToMissedRewardsSummary(MissedRewardsSummaryResponse domain);
}

public sealed class AnalyticsMapper : IAnalyticsMapper
{
    public AnalyticsPeriodRequest ToDomain(string periodCode) => new(periodCode);

    public RewardsSummaryResponseVm ToRewardsSummary(RewardsSummaryResponse domain) =>
        new(
            ToMoney(domain.Earned, domain.CurrencyCode),
            ToMoney(domain.Missed, domain.CurrencyCode),
            ToMoney(domain.EarnedDelta, domain.CurrencyCode),
            ToMoney(domain.MissedDelta, domain.CurrencyCode),
            domain.DailyBreakdown.Select(i => ToBreakdownItem(i, domain.CurrencyCode)).ToArray(),
            domain.CategoryBreakdown.Select(i => ToBreakdownItem(i, domain.CurrencyCode)).ToArray(),
            domain.TopMissedRewards.Select(ToMissedReward).ToArray());

    public MissedRewardsSummaryResponseVm ToMissedRewardsSummary(MissedRewardsSummaryResponse domain) =>
        new(
            ToMoney(domain.Missed, domain.CurrencyCode),
            ToMoney(domain.MissedDelta, domain.CurrencyCode),
            domain.TopMissedRewards.Select(ToMissedReward).ToArray());

    private static MoneyVm ToMoney(decimal amount, string currencyCode) =>
        new(amount, currencyCode, FormatMoney(amount, currencyCode));

    private static string FormatMoney(decimal amount, string currencyCode) =>
        currencyCode == "cash_back" ? $"${amount:F2}" : $"{amount:F0} pts";

    private static RewardBreakdownItemVm ToBreakdownItem(RewardBreakdownItem item, string currencyCode) =>
        new(item.Key, item.Label,
            new MoneyVm(item.Earned, currencyCode, FormatMoney(item.Earned, currencyCode)),
            new MoneyVm(item.Missed, currencyCode, FormatMoney(item.Missed, currencyCode)));

    private static MissedRewardVm ToMissedReward(MissedRewardSummary m) =>
        new(m.Id, m.TransactionId, m.MerchantName, m.ActualCardName, m.BetterCardName,
            new MoneyVm(m.ActualReward, "cash_back", $"${m.ActualReward:F2}"),
            new MoneyVm(m.PotentialReward, "cash_back", $"${m.PotentialReward:F2}"),
            new MoneyVm(m.MissedReward, "cash_back", $"${m.MissedReward:F2}"),
            m.IsDismissed);
}
