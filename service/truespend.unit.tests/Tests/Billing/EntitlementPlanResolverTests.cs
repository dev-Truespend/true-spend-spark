using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Billing;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Billing;

public sealed class EntitlementPlanResolverTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 1, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Trialing_overrides_picked_plan_with_pro()
    {
        var subscription = new SubscriptionResponse(
            PlanCode: BillingConstants.BasicPlanCode,
            Status: BillingConstants.TrialingStatusCode,
            TrialEnd: Now.AddDays(5),
            CurrentPeriodEnd: Now.AddDays(5),
            CancelAtPeriodEnd: false);

        Assert.Equal(BillingConstants.ProPlanCode, EntitlementPlanResolver.Resolve(subscription, Now));
    }

    [Fact]
    public void Active_returns_picked_plan()
    {
        var subscription = new SubscriptionResponse(
            PlanCode: BillingConstants.BasicPlanCode,
            Status: BillingConstants.ActiveStatusCode,
            TrialEnd: null,
            CurrentPeriodEnd: Now.AddDays(20),
            CancelAtPeriodEnd: false);

        Assert.Equal(BillingConstants.BasicPlanCode, EntitlementPlanResolver.Resolve(subscription, Now));
    }

    [Theory]
    [InlineData("past_due", -1, "pro")]
    [InlineData("past_due", -25, "basic")]
    [InlineData("unpaid", -1, "pro")]
    [InlineData("unpaid", -48, "basic")]
    public void Past_due_and_unpaid_respect_24h_grace_window(string status, int hoursOffset, string expected)
    {
        var subscription = new SubscriptionResponse(
            PlanCode: BillingConstants.ProPlanCode,
            Status: status,
            TrialEnd: null,
            CurrentPeriodEnd: Now.AddHours(hoursOffset),
            CancelAtPeriodEnd: false);

        Assert.Equal(expected, EntitlementPlanResolver.Resolve(subscription, Now));
    }

    [Theory]
    [InlineData("canceled")]
    [InlineData("none")]
    [InlineData("incomplete_expired")]
    public void Terminal_or_missing_subscription_drops_to_basic(string status)
    {
        var subscription = new SubscriptionResponse(
            PlanCode: BillingConstants.ProPlanCode,
            Status: status,
            TrialEnd: null,
            CurrentPeriodEnd: null,
            CancelAtPeriodEnd: false);

        Assert.Equal(BillingConstants.BasicPlanCode, EntitlementPlanResolver.Resolve(subscription, Now));
    }
}
