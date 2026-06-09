using Microsoft.Extensions.Options;
using Moq;
using TrueSpend.Domain.Business.Billing;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.App;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Billing;

public sealed class ManualResyncQuotaBusinessTests
{
    private static ManualResyncQuotaBusiness Build(Mock<IUserDailyUsageService> usage, Mock<IEntitlementGuard> guard, int limit = 5) =>
        new(usage.Object, guard.Object, Options.Create(new ManualResyncOptions { ProResyncDailyLimit = limit }));

    private static Mock<IEntitlementGuard> ProGuard()
    {
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.HasFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), BillingConstants.ManualResyncEnabledFeatureCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), BillingConstants.ManualResyncEnabledFeatureCode, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        return guard;
    }

    [Fact]
    public async Task TryConsume_increments_and_allows_when_under_limit()
    {
        var usage = new Mock<IUserDailyUsageService>();
        usage.Setup(u => u.GetPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>())).ReturnsAsync(2);
        usage.Setup(u => u.IncrementPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>())).ReturnsAsync(3);

        var result = await Build(usage, ProGuard()).TryConsumeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Allowed);
        Assert.Equal(2, result.Status.Remaining);
        usage.Verify(u => u.IncrementPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetStatus_reports_used_and_remaining()
    {
        var usage = new Mock<IUserDailyUsageService>();
        usage.Setup(u => u.GetPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>())).ReturnsAsync(4);

        var result = await Build(usage, ProGuard()).GetStatusAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.True(result.Data!.IsPro);
        Assert.Equal(4, result.Data.Used);
        Assert.Equal(1, result.Data.Remaining);
    }

    [Fact]
    public async Task TryConsume_blocks_without_increment_when_limit_reached()
    {
        var usage = new Mock<IUserDailyUsageService>();
        usage.Setup(u => u.GetPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<CancellationToken>())).ReturnsAsync(5);

        var result = await Build(usage, ProGuard()).TryConsumeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.False(result.Allowed);
        Assert.Equal(0, result.Status.Remaining);
        usage.Verify(u => u.IncrementPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task TryConsume_throws_when_not_pro()
    {
        var usage = new Mock<IUserDailyUsageService>();
        var guard = new Mock<IEntitlementGuard>();
        guard.Setup(g => g.RequireFeatureAsync(It.IsAny<OnboardingWorkflowUser>(), BillingConstants.ManualResyncEnabledFeatureCode, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new EntitlementRequiredAppException(BillingConstants.ManualResyncEnabledFeatureCode, BillingConstants.ProPlanCode, "This feature is available on Pro."));

        await Assert.ThrowsAsync<EntitlementRequiredAppException>(() => Build(usage, guard).TryConsumeAsync(TestUserFactory.AnyUser(), CancellationToken.None));
        usage.Verify(u => u.IncrementPlaidResyncCountAsync(It.IsAny<Guid>(), It.IsAny<DateOnly>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
