using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Billing;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Billing;

public sealed class StripeWebhookBusinessTests
{
    private static StripeWebhookInput Input(string eventId = "evt_1", string eventType = "customer.subscription.updated") =>
        new(eventId, eventType, "{}");

    private static (StripeWebhookBusiness business,
                    Mock<IStripeProvider> stripe,
                    Mock<IStripeWebhookService> webhookService,
                    Mock<IBillingReadService> read,
                    Mock<IBillingUpdateService> update,
                    Mock<IMessagingInsertService> messaging,
                    Mock<IEntitlementCacheInvalidatorBusiness> entitlementInvalidator,
                    Mock<IBillingPaymentMethodCacheInvalidatorBusiness> paymentMethodInvalidator,
                    FakeUnitOfWork unitOfWork) NewBusiness()
    {
        var stripe = new Mock<IStripeProvider>();
        var webhookService = new Mock<IStripeWebhookService>();
        var read = new Mock<IBillingReadService>();
        var update = new Mock<IBillingUpdateService>();
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var entitlementInvalidator = new Mock<IEntitlementCacheInvalidatorBusiness>();
        var paymentMethodInvalidator = new Mock<IBillingPaymentMethodCacheInvalidatorBusiness>();
        var unitOfWork = new FakeUnitOfWork();

        var business = new StripeWebhookBusiness(
            stripe.Object,
            webhookService.Object,
            read.Object,
            update.Object,
            messaging.Object,
            unitOfWork,
            entitlementInvalidator.Object,
            paymentMethodInvalidator.Object,
            NullLogger<StripeWebhookBusiness>.Instance);

        return (business, stripe, webhookService, read, update, messaging, entitlementInvalidator, paymentMethodInvalidator, unitOfWork);
    }

    [Fact]
    public async Task Handle_subscription_updated_upserts_subscription_and_invalidates_entitlement_cache()
    {
        var ctx = NewBusiness();
        var userId = Guid.NewGuid();
        var subscription = new StripeSubscriptionData(
            "sub_123", "cus_123", "price_pro_annual", "active",
            TestUserFactory.FixedNow, TestUserFactory.FixedNow.AddMonths(1), null, false, null);
        var envelope = new StripeEventEnvelope("evt_1", "customer.subscription.updated", subscription, null, null);

        ctx.stripe.Setup(s => s.ParseWebhookEvent(It.IsAny<string>())).Returns(envelope);
        ctx.webhookService.Setup(s => s.WebhookEventExistsAsync("evt_1", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        ctx.read.Setup(r => r.GetUserIdByStripeCustomerIdAsync("cus_123", It.IsAny<CancellationToken>())).ReturnsAsync(userId);
        ctx.read.Setup(r => r.LookupPlanPriceByStripePriceIdAsync("price_pro_annual", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlanPriceLookup(2, "pro", 100, 7, "price_pro_annual"));
        ctx.update.Setup(u => u.GetSubscriptionStatusIdAsync("active", It.IsAny<CancellationToken>())).ReturnsAsync((short)1);

        var response = await ctx.business.HandleEventAsync(Input(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.True(response.Data!.Persisted);
        Assert.False(response.Data.AlreadyProcessed);
        ctx.update.Verify(u => u.UpsertSubscriptionAsync(userId, subscription, It.IsAny<PlanPriceLookup>(), (short)1, It.IsAny<CancellationToken>()), Times.Once);
        ctx.entitlementInvalidator.Verify(i => i.InvalidateAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
        ctx.paymentMethodInvalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_payment_method_attached_upserts_and_invalidates_payment_method_cache()
    {
        var ctx = NewBusiness();
        var userId = Guid.NewGuid();
        var paymentMethod = new StripePaymentMethodData("pm_1", "cus_123", "visa", "4242", 12, 2030, Detached: false);
        var envelope = new StripeEventEnvelope("evt_2", "payment_method.attached", null, paymentMethod, null);

        ctx.stripe.Setup(s => s.ParseWebhookEvent(It.IsAny<string>())).Returns(envelope);
        ctx.webhookService.Setup(s => s.WebhookEventExistsAsync("evt_2", It.IsAny<CancellationToken>())).ReturnsAsync(false);
        ctx.read.Setup(r => r.GetUserIdByStripeCustomerIdAsync("cus_123", It.IsAny<CancellationToken>())).ReturnsAsync(userId);
        ctx.read.Setup(r => r.GetStripeCustomerRowIdAsync("cus_123", It.IsAny<CancellationToken>())).ReturnsAsync(7);

        var response = await ctx.business.HandleEventAsync(Input("evt_2", "payment_method.attached"), CancellationToken.None);

        Assert.True(response.Success);
        ctx.update.Verify(u => u.UpsertPaymentMethodAsync(userId, 7, paymentMethod, It.IsAny<CancellationToken>()), Times.Once);
        ctx.paymentMethodInvalidator.Verify(i => i.InvalidateAsync(userId, It.IsAny<CancellationToken>()), Times.Once);
        ctx.entitlementInvalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_returns_deduplicated_when_event_already_processed()
    {
        var ctx = NewBusiness();
        ctx.webhookService.Setup(s => s.WebhookEventExistsAsync("evt_1", It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var response = await ctx.business.HandleEventAsync(Input(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.True(response.Data!.AlreadyProcessed);
        Assert.False(response.Data.Persisted);
        ctx.update.Verify(u => u.UpsertSubscriptionAsync(It.IsAny<Guid>(), It.IsAny<StripeSubscriptionData>(), It.IsAny<PlanPriceLookup>(), It.IsAny<short>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.entitlementInvalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
        ctx.paymentMethodInvalidator.Verify(i => i.InvalidateAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Handle_fails_when_event_id_or_type_missing()
    {
        var ctx = NewBusiness();

        var response = await ctx.business.HandleEventAsync(new StripeWebhookInput(string.Empty, "x", "{}"), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
    }

    #region archive — async event-publish (disabled in MVP)
    // Handle_subscription_updated_upserts_subscription_and_publishes_outbox previously asserted:
    //     ctx.messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         EventTypes.BillingSubscriptionUpdated, "billing.subscription", null,
    //         It.IsAny<string>(), "billing.subscription.updated:evt_1",
    //         It.IsAny<CancellationToken>()), Times.Once);
    // Replaced with the inline IEntitlementCacheInvalidatorBusiness.InvalidateAsync assertion.
    //
    // Handle_payment_method_attached_upserts_and_publishes_outbox previously asserted:
    //     ctx.messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         EventTypes.BillingPaymentMethodUpdated, "billing.payment_method", null,
    //         It.IsAny<string>(), "billing.payment_method.updated:evt_2",
    //         It.IsAny<CancellationToken>()), Times.Once);
    // Replaced with the inline IBillingPaymentMethodCacheInvalidatorBusiness.InvalidateAsync assertion.
    #endregion
}
