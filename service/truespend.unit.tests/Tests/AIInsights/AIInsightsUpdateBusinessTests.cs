using Moq;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.AIInsights;

public sealed class AIInsightsUpdateBusinessTests
{
    [Fact]
    public async Task DismissInsight_returns_404_when_insight_not_found()
    {
        var readService = new Mock<IAIInsightsReadService>();
        var updateService = new Mock<IAIInsightsUpdateService>();
        updateService.Setup(s => s.DismissInsightAsync(It.IsAny<int>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new NotFoundAppException("Not found"));
        var business = new AIInsightsUpdateBusiness(readService.Object, updateService.Object);

        var result = await business.DismissInsightAsync(TestUserFactory.AnyUser(), 99, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(404, result.StatusCode);
    }

    [Fact]
    public async Task DismissInsight_returns_updated_insights_on_success()
    {
        var insight = new AIInsight(1, "reward_optimization", "high", "Use Chase", "Details", DateTimeOffset.UtcNow);
        var readService = new Mock<IAIInsightsReadService>();
        readService.Setup(s => s.PersonalizedInsightsEnabledAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        readService.Setup(s => s.GetActiveInsightsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { insight });
        var updateService = new Mock<IAIInsightsUpdateService>();
        var business = new AIInsightsUpdateBusiness(readService.Object, updateService.Object);

        var result = await business.DismissInsightAsync(TestUserFactory.AnyUser(), 1, CancellationToken.None);

        Assert.True(result.Success);
        Assert.Single(result.Data!.Insights);
        updateService.Verify(s => s.DismissInsightAsync(1, It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
