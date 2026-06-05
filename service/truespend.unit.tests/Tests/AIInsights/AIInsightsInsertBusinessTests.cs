using Moq;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.AIInsights;

public sealed class AIInsightsInsertBusinessTests
{
    [Fact]
    public async Task GenerateInsights_throws_entitlement_required_when_feature_disabled()
    {
        var readService = new Mock<IAIInsightsReadService>();
        var insertService = new Mock<IAIInsightsInsertService>();
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), BillingConstants.AiInsightsEnabledFeatureCode, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EntitlementRequiredAppException(BillingConstants.AiInsightsEnabledFeatureCode, BillingConstants.ProPlanCode, "This feature is available on Pro."));
        var business = new AIInsightsInsertBusiness(readService.Object, insertService.Object, guard.Object);

        await Assert.ThrowsAsync<EntitlementRequiredAppException>(() => business.GenerateInsightsAsync(TestUserFactory.AnyUser(), CancellationToken.None));
        insertService.Verify(s => s.CreateGenerationRunAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateInsights_returns_403_when_privacy_disabled()
    {
        var readService = new Mock<IAIInsightsReadService>();
        readService.Setup(s => s.PersonalizedInsightsEnabledAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var insertService = new Mock<IAIInsightsInsertService>();
        var business = new AIInsightsInsertBusiness(readService.Object, insertService.Object, PassThroughGuard().Object);

        var result = await business.GenerateInsightsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.False(result.Success);
        Assert.Equal(403, result.StatusCode);
        insertService.Verify(s => s.CreateGenerationRunAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GenerateInsights_creates_run_and_returns_202_when_entitled_and_privacy_enabled()
    {
        var run = new InsightGenerationRun(42, Guid.NewGuid(), "pending");
        var readService = new Mock<IAIInsightsReadService>();
        readService.Setup(s => s.PersonalizedInsightsEnabledAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var insertService = new Mock<IAIInsightsInsertService>();
        insertService.Setup(s => s.CreateGenerationRunAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(run);
        var business = new AIInsightsInsertBusiness(readService.Object, insertService.Object, PassThroughGuard().Object);

        var result = await business.GenerateInsightsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(202, result.StatusCode);
        Assert.Equal(42, result.Data!.RunId);
        Assert.Equal("pending", result.Data.Status);
    }

    private static Mock<IEntitlementGuard> PassThroughGuard()
    {
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return guard;
    }
}
