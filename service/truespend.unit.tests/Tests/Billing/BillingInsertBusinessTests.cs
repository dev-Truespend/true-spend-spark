using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using TrueSpend.Domain.Business.Billing;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.Services.Billing;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Billing;

public sealed class BillingInsertBusinessTests
{
    private static CreateCheckoutSessionRequest OnboardingRequest() => new("pro", "annual", "onboarding");
    private static CreateCheckoutSessionRequest BillingRequest() => new("pro", "annual", "billing");

    private static (Mock<IStripeProvider> stripe,
                    Mock<IBillingReadService> read,
                    Mock<IBillingInsertService> insert,
                    Mock<IOnboardingReadService> onboardingRead,
                    Mock<IOnboardingUpdateService> onboardingUpdate,
                    Mock<IEntitlementCacheInvalidatorBusiness> entitlement,
                    BillingInsertBusiness business) NewBusiness(PlanPriceLookup? planPrice = null, string? stripeCustomerId = null, bool simulateCheckout = false)
    {
        var stripe = new Mock<IStripeProvider>();
        var read = new Mock<IBillingReadService>();
        var insert = new Mock<IBillingInsertService>();
        var onboardingRead = new Mock<IOnboardingReadService>();
        var onboardingUpdate = new Mock<IOnboardingUpdateService>();
        var entitlement = new Mock<IEntitlementCacheInvalidatorBusiness>();

        read.Setup(r => r.LookupPlanPriceAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(planPrice ?? new PlanPriceLookup(2, "pro", 100, 7, "price_pro_annual"));
        read.Setup(r => r.GetStripeCustomerIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(stripeCustomerId);
        read.Setup(r => r.GetProfileEmailAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("taylor@example.com");

        stripe.Setup(s => s.CreateCheckoutSessionAsync(It.IsAny<CheckoutSessionInput>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HostedBillingResponse("https://checkout.stripe.com/session/cs_123"));
        stripe.Setup(s => s.CreatePortalSessionAsync(It.IsAny<PortalSessionInput>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HostedBillingResponse("https://billing.stripe.com/p/session/ps_123"));

        insert.Setup(i => i.RecordTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SubscriptionResponse("pro", "trialing", TestUserFactory.FixedNow.AddDays(7), TestUserFactory.FixedNow.AddMonths(1), false));
        insert.Setup(i => i.RecordSimulatedTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SubscriptionResponse("pro", "trialing", TestUserFactory.FixedNow.AddDays(7), TestUserFactory.FixedNow.AddDays(7), false));

        onboardingRead.Setup(r => r.GetOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingResponse("plan_selection", true, false, false, false));
        onboardingUpdate.Setup(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, OnboardingResponse value, CancellationToken _) => value);

        var options = Options.Create(new StripeProviderOptions { SimulateCheckout = simulateCheckout });
        var business = new BillingInsertBusiness(stripe.Object, read.Object, insert.Object, onboardingRead.Object, onboardingUpdate.Object, entitlement.Object, new FakeUnitOfWork(), options, NullLogger<BillingInsertBusiness>.Instance, new BillingValidator());

        return (stripe, read, insert, onboardingRead, onboardingUpdate, entitlement, business);
    }

    [Fact]
    public async Task CreateCheckout_for_onboarding_records_trial_advances_step_and_creates_session()
    {
        var ctx = NewBusiness();

        var response = await ctx.business.CreateCheckoutAsync(TestUserFactory.AnyUser(), OnboardingRequest(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("https://checkout.stripe.com/session/cs_123", response.Data!.Url);
        ctx.insert.Verify(b => b.RecordTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), "pro", It.IsAny<CancellationToken>()), Times.Once);
        ctx.onboardingUpdate.Verify(u => u.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "notifications"),
            It.IsAny<CancellationToken>()), Times.Once);
        ctx.stripe.Verify(s => s.CreateCheckoutSessionAsync(It.Is<CheckoutSessionInput>(i => i.StripePriceId == "price_pro_annual" && i.TrialDays == 7), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateCheckout_for_billing_context_skips_onboarding_and_trial_record()
    {
        var ctx = NewBusiness(stripeCustomerId: "cus_existing");

        var response = await ctx.business.CreateCheckoutAsync(TestUserFactory.AnyUser(), BillingRequest(), CancellationToken.None);

        Assert.True(response.Success);
        ctx.insert.Verify(b => b.RecordTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.onboardingUpdate.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.stripe.Verify(s => s.CreateCheckoutSessionAsync(It.Is<CheckoutSessionInput>(i => i.ExistingStripeCustomerId == "cus_existing"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreatePortal_returns_hosted_url_when_customer_linked()
    {
        var ctx = NewBusiness(stripeCustomerId: "cus_existing");

        var response = await ctx.business.CreatePortalAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("https://billing.stripe.com/p/session/ps_123", response.Data!.Url);
        ctx.stripe.Verify(s => s.CreatePortalSessionAsync(It.Is<PortalSessionInput>(i => i.StripeCustomerId == "cus_existing"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreatePortal_fails_when_no_stripe_customer_linked()
    {
        var ctx = NewBusiness();

        var response = await ctx.business.CreatePortalAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(409, response.StatusCode);
        ctx.stripe.Verify(s => s.CreatePortalSessionAsync(It.IsAny<PortalSessionInput>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateCheckout_rejects_unsupported_return_context()
    {
        var ctx = NewBusiness();

        var response = await ctx.business.CreateCheckoutAsync(TestUserFactory.AnyUser(),
            new CreateCheckoutSessionRequest("pro", "monthly", "marketing"), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Contains(response.Errors, e => e.Contains("Return context"));
        ctx.stripe.Verify(s => s.CreateCheckoutSessionAsync(It.IsAny<CheckoutSessionInput>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SimulateCheckout_onboarding_records_trial_advances_step_invalidates_cache_and_skips_stripe()
    {
        var ctx = NewBusiness(simulateCheckout: true);

        var response = await ctx.business.CreateCheckoutAsync(TestUserFactory.AnyUser(), OnboardingRequest(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(string.Empty, response.Data!.Url); // empty url => client treats as completed, no browser hand-off
        ctx.insert.Verify(b => b.RecordSimulatedTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), "pro", It.IsAny<CancellationToken>()), Times.Once);
        ctx.onboardingUpdate.Verify(u => u.SaveOnboardingAsync(
            It.IsAny<OnboardingWorkflowUser>(),
            It.Is<OnboardingResponse>(o => o.CurrentStepCode == "notifications"),
            It.IsAny<CancellationToken>()), Times.Once);
        ctx.entitlement.Verify(e => e.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Once);
        ctx.stripe.Verify(s => s.CreateCheckoutSessionAsync(It.IsAny<CheckoutSessionInput>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SimulateCheckout_billing_context_switches_plan_without_onboarding_or_stripe()
    {
        var ctx = NewBusiness(simulateCheckout: true);

        var response = await ctx.business.CreateCheckoutAsync(TestUserFactory.AnyUser(), BillingRequest(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(string.Empty, response.Data!.Url);
        ctx.insert.Verify(b => b.RecordSimulatedTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), "pro", It.IsAny<CancellationToken>()), Times.Once);
        ctx.onboardingUpdate.Verify(u => u.SaveOnboardingAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<OnboardingResponse>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.stripe.Verify(s => s.CreateCheckoutSessionAsync(It.IsAny<CheckoutSessionInput>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SimulateCheckout_succeeds_even_when_plan_has_no_stripe_price()
    {
        // TestFlight plans may have no Stripe price configured; simulate must bypass the 422 gate.
        var ctx = NewBusiness(planPrice: new PlanPriceLookup(2, "pro", 100, 7, null), simulateCheckout: true);

        var response = await ctx.business.CreateCheckoutAsync(TestUserFactory.AnyUser(), OnboardingRequest(), CancellationToken.None);

        Assert.True(response.Success);
        ctx.insert.Verify(b => b.RecordSimulatedTrialingSubscriptionAsync(It.IsAny<OnboardingWorkflowUser>(), "pro", It.IsAny<CancellationToken>()), Times.Once);
    }
}
