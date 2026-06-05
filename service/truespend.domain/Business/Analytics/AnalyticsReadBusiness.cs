using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.Models.Analytics;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Validators;
using System.Text.Json;
using TrueSpend.Domain.Exceptions;

namespace TrueSpend.Domain.Business.Analytics;

public sealed class AnalyticsReadBusiness(
    IAnalyticsReadService service,
    AnalyticsValidator validator) : IAnalyticsReadBusiness
{
    private const int TopMissedRewardsLimit = 5;

    public async Task<BusinessResponse<RewardsSummaryResponse>> GetRewardsSummaryAsync(
        OnboardingWorkflowUser user, AnalyticsPeriodRequest request, CancellationToken cancellationToken)
    {
        var validationErrors = validator.ValidatePeriodRequest(request);
        if (validationErrors.Count > 0)
            return BusinessResponse<RewardsSummaryResponse>.Fail(validationErrors, 400);

        if (!await service.PeriodExistsAsync(request.PeriodCode, cancellationToken))
            return BusinessResponse<RewardsSummaryResponse>.Fail([ExceptionMessages.InvalidAnalyticsPeriod], 400);

        var snapshot = await service.GetSnapshotAsync(user.UserId, request.PeriodCode, cancellationToken);

        if (snapshot is null)
            return BusinessResponse<RewardsSummaryResponse>.Ok(EmptyRewardsSummary());

        var daily = DeserializeBreakdown(snapshot.DailyBreakdown);
        var category = DeserializeBreakdown(snapshot.CategoryBreakdown);

        var topMissed = await service.GetTopMissedRewardsAsync(
            user.UserId, snapshot.PeriodStart, snapshot.PeriodEnd, TopMissedRewardsLimit, cancellationToken);

        var response = new RewardsSummaryResponse(
            snapshot.EarnedAmount,
            snapshot.MissedAmount,
            snapshot.EarnedAmount - snapshot.PriorEarnedAmount,
            snapshot.MissedAmount - snapshot.PriorMissedAmount,
            snapshot.EarnedCurrencyCode,
            daily,
            category,
            topMissed);

        return BusinessResponse<RewardsSummaryResponse>.Ok(response);
    }

    public async Task<BusinessResponse<MissedRewardsSummaryResponse>> GetMissedRewardsSummaryAsync(
        OnboardingWorkflowUser user, AnalyticsPeriodRequest request, CancellationToken cancellationToken)
    {
        var validationErrors = validator.ValidatePeriodRequest(request);
        if (validationErrors.Count > 0)
            return BusinessResponse<MissedRewardsSummaryResponse>.Fail(validationErrors, 400);

        if (!await service.PeriodExistsAsync(request.PeriodCode, cancellationToken))
            return BusinessResponse<MissedRewardsSummaryResponse>.Fail([ExceptionMessages.InvalidAnalyticsPeriod], 400);

        var snapshot = await service.GetSnapshotAsync(user.UserId, request.PeriodCode, cancellationToken);

        if (snapshot is null)
            return BusinessResponse<MissedRewardsSummaryResponse>.Ok(
                new MissedRewardsSummaryResponse(0m, 0m, "cash_back", []));

        var topMissed = await service.GetTopMissedRewardsAsync(
            user.UserId, snapshot.PeriodStart, snapshot.PeriodEnd, TopMissedRewardsLimit, cancellationToken);

        var response = new MissedRewardsSummaryResponse(
            snapshot.MissedAmount,
            snapshot.MissedAmount - snapshot.PriorMissedAmount,
            snapshot.EarnedCurrencyCode,
            topMissed);

        return BusinessResponse<MissedRewardsSummaryResponse>.Ok(response);
    }

    private static RewardsSummaryResponse EmptyRewardsSummary() =>
        new(0m, 0m, 0m, 0m, "cash_back", [], [], []);

    private static IReadOnlyList<RewardBreakdownItem> DeserializeBreakdown(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<RewardBreakdownItem>>(json,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? [];
        }
        catch
        {
            return [];
        }
    }
}
