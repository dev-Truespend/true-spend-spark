using Moq;
using TrueSpend.Domain.Business.Analytics;
using TrueSpend.Domain.Models.Analytics;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Analytics;

public sealed class AnalyticsReadBusinessTests
{
    private static readonly AnalyticsValidator Validator = new();

    [Fact]
    public async Task GetRewardsSummary_returns_empty_when_no_snapshot_exists()
    {
        var service = NewService(null);
        var business = new AnalyticsReadBusiness(service.Object, Validator);

        var result = await business.GetRewardsSummaryAsync(
            TestUserFactory.AnyUser(), new AnalyticsPeriodRequest("month"), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(0m, result.Data!.Earned);
        Assert.Equal(0m, result.Data.Missed);
        Assert.Empty(result.Data.DailyBreakdown);
    }

    [Fact]
    public async Task GetRewardsSummary_returns_400_for_invalid_period_code()
    {
        var service = NewService(null);
        var business = new AnalyticsReadBusiness(service.Object, Validator);

        var result = await business.GetRewardsSummaryAsync(
            TestUserFactory.AnyUser(), new AnalyticsPeriodRequest(""), CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(400, result.StatusCode);
    }

    [Fact]
    public async Task GetRewardsSummary_returns_snapshot_totals_when_exists()
    {
        var snapshot = new AnalyticsSnapshot(
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30)),
            DateOnly.FromDateTime(DateTime.UtcNow),
            42.50m,
            "cash_back",
            10.00m,
            30.00m,
            5.00m,
            "[]",
            "[]");
        var service = NewService(snapshot);
        var business = new AnalyticsReadBusiness(service.Object, Validator);

        var result = await business.GetRewardsSummaryAsync(
            TestUserFactory.AnyUser(), new AnalyticsPeriodRequest("month"), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(42.50m, result.Data!.Earned);
        Assert.Equal(10.00m, result.Data.Missed);
        Assert.Equal(12.50m, result.Data.EarnedDelta);
    }

    private static Mock<IAnalyticsReadService> NewService(AnalyticsSnapshot? snapshot)
    {
        var service = new Mock<IAnalyticsReadService>();
        service.Setup(s => s.PeriodExistsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        service.Setup(s => s.GetSnapshotAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(snapshot);
        service.Setup(s => s.GetTopMissedRewardsAsync(
                It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<DateOnly>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<MissedRewardSummary>());
        return service;
    }
}
