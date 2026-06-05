using Moq;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.AIInsights;

public sealed class AIInsightsReadBusinessTests
{
    [Fact]
    public async Task GetInsights_returns_empty_when_privacy_disabled()
    {
        var service = new Mock<IAIInsightsReadService>();
        service.Setup(s => s.PersonalizedInsightsEnabledAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var business = new AIInsightsReadBusiness(service.Object, PassThroughGuard().Object);

        var result = await business.GetInsightsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Empty(result.Data!.Insights);
        service.Verify(s => s.GetActiveInsightsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetInsights_returns_active_insights_when_privacy_enabled()
    {
        var insight = new AIInsight(1, "reward_optimization", "high", "Use your Chase card", "Details here", DateTimeOffset.UtcNow);
        var service = new Mock<IAIInsightsReadService>();
        service.Setup(s => s.PersonalizedInsightsEnabledAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        service.Setup(s => s.GetActiveInsightsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { insight });
        var business = new AIInsightsReadBusiness(service.Object, PassThroughGuard().Object);

        var result = await business.GetInsightsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Single(result.Data!.Insights);
        Assert.Equal("reward_optimization", result.Data.Insights[0].TypeCode);
    }

    [Fact]
    public async Task GetGenerationRun_returns_404_when_run_not_found()
    {
        var service = new Mock<IAIInsightsReadService>();
        service.Setup(s => s.GetRunAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((InsightGenerationRun?)null);
        var business = new AIInsightsReadBusiness(service.Object, PassThroughGuard().Object);

        var result = await business.GetGenerationRunAsync(TestUserFactory.AnyUser(), 99, CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(404, result.StatusCode);
    }

    private static Mock<IEntitlementGuard> PassThroughGuard()
    {
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return guard;
    }
}
