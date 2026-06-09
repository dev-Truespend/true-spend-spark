using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.AIInsights;

public sealed class AIInsightsGenerationBusinessTests
{
    private static AIInsightsGenerationBusiness Build(
        Mock<IAIInsightsReadService> readService,
        Mock<IAIInsightsInsertService> insertService,
        Mock<IEntitlementGuard> guard)
    {
        var openAi = new Mock<IAIOpenAIService>();
        openAi.Setup(o => o.GenerateInsightsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<GeneratedInsight>)new List<GeneratedInsight>
            {
                new("missed_reward", "high", "Title", "Body")
            });

        return new AIInsightsGenerationBusiness(
            readService.Object,
            insertService.Object,
            new Mock<IAIInsightsUpdateService>().Object,
            openAi.Object,
            new Mock<IMessagingInsertService>().Object,
            guard.Object,
            new FakeUnitOfWork(),
            new Mock<IAIInsightsCacheInvalidatorBusiness>().Object,
            NullLogger<AIInsightsGenerationBusiness>.Instance);
    }

    [Fact]
    public async Task GenerateForAllEligibleUsers_creates_and_processes_run_for_entitled_user()
    {
        var userId = TestUserFactory.FixedUserId;

        var readSvc = new Mock<IAIInsightsReadService>();
        readSvc.Setup(s => s.GetNightlyGenerationCandidatesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Guid>)new List<Guid> { userId });

        var insertSvc = new Mock<IAIInsightsInsertService>();
        insertSvc.Setup(s => s.CreateGenerationRunAsync(userId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new InsightGenerationRun(42, userId, "pending"));

        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.HasFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var business = Build(readSvc, insertSvc, guard);
        await business.GenerateForAllEligibleUsersAsync(CancellationToken.None);

        insertSvc.Verify(s => s.CreateGenerationRunAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
        insertSvc.Verify(s => s.InsertInsightsAsync(42, userId, It.IsAny<IReadOnlyList<GeneratedInsight>>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GenerateForAllEligibleUsers_skips_user_without_entitlement()
    {
        var userId = TestUserFactory.FixedUserId;

        var readSvc = new Mock<IAIInsightsReadService>();
        readSvc.Setup(s => s.GetNightlyGenerationCandidatesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Guid>)new List<Guid> { userId });

        var insertSvc = new Mock<IAIInsightsInsertService>();

        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.HasFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var business = Build(readSvc, insertSvc, guard);
        await business.GenerateForAllEligibleUsersAsync(CancellationToken.None);

        insertSvc.Verify(s => s.CreateGenerationRunAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
