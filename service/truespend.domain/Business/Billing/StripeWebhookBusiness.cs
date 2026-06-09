using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Persistence;

namespace TrueSpend.Domain.Business.Billing;

public sealed class StripeWebhookBusiness(
    IStripeProvider stripeProvider,
    IStripeWebhookService webhookService,
    IBillingReadService billingReadService,
    IBillingUpdateService billingUpdateService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IEntitlementCacheInvalidatorBusiness entitlementCacheInvalidator,
    IBillingPaymentMethodCacheInvalidatorBusiness paymentMethodCacheInvalidator,
    ILogger<StripeWebhookBusiness> logger) : IStripeWebhookBusiness
{
    public async Task<BusinessResponse<StripeWebhookResult>> HandleEventAsync(StripeWebhookInput input, CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        if (string.IsNullOrWhiteSpace(input.StripeEventId) || string.IsNullOrWhiteSpace(input.EventType))
        {
            return BusinessResponse<StripeWebhookResult>.Fail(["Stripe event id and type are required."], 400);
        }

        if (await webhookService.WebhookEventExistsAsync(input.StripeEventId, cancellationToken))
        {
            return BusinessResponse<StripeWebhookResult>.Ok(new StripeWebhookResult(false, true));
        }

        var envelope = stripeProvider.ParseWebhookEvent(input.RawPayload) ??
            new StripeEventEnvelope(input.StripeEventId, input.EventType, null, null, null);

        Guid? subscriptionUserId = null;
        Guid? paymentMethodUserId = null;

        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        try
        {
            await webhookService.RecordWebhookEventAsync(input, cancellationToken);
        }
        catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
        {
            // Concurrent webhook with the same stripe_event_id won the insert race —
            // treat as a dedup hit so Stripe stops retrying.
            await tx.RollbackAsync(cancellationToken);
            return BusinessResponse<StripeWebhookResult>.Ok(new StripeWebhookResult(false, true));
        }

        if (envelope.Customer is { } customer)
        {
            await HandleCustomerAsync(customer, cancellationToken);
        }

        if (envelope.Subscription is { } subscription)
        {
            subscriptionUserId = await HandleSubscriptionAsync(envelope, subscription, cancellationToken);
        }

        if (envelope.PaymentMethod is { } paymentMethod)
        {
            paymentMethodUserId = await HandlePaymentMethodAsync(envelope, paymentMethod, cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);

        if (subscriptionUserId is { } subUserId && subUserId != Guid.Empty)
        {
            try
            {
                await entitlementCacheInvalidator.InvalidateAsync(subUserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Entitlement cache invalidation failed after Stripe subscription update for user {UserId}", subUserId);
            }
        }

        if (paymentMethodUserId is { } pmUserId && pmUserId != Guid.Empty)
        {
            try
            {
                await paymentMethodCacheInvalidator.InvalidateAsync(pmUserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Payment-method cache invalidation failed after Stripe payment-method update for user {UserId}", pmUserId);
            }
        }

        return BusinessResponse<StripeWebhookResult>.Ok(new StripeWebhookResult(true, false));
    }

    private async Task HandleCustomerAsync(StripeCustomerData customer, CancellationToken cancellationToken)
    {
        var userId = customer.UserId ?? await billingReadService.GetUserIdByStripeCustomerIdAsync(customer.StripeCustomerId, cancellationToken);
        if (userId is null) return;
        await billingUpdateService.UpsertStripeCustomerAsync(userId.Value, customer, cancellationToken);
    }

    private async Task<Guid?> HandleSubscriptionAsync(StripeEventEnvelope envelope, StripeSubscriptionData subscription, CancellationToken cancellationToken)
    {
        var userId = await billingReadService.GetUserIdByStripeCustomerIdAsync(subscription.StripeCustomerId, cancellationToken);

        if (string.Equals(envelope.EventType, "customer.subscription.deleted", StringComparison.OrdinalIgnoreCase))
        {
            var cancelledStatusId = await billingUpdateService.GetSubscriptionStatusIdAsync("canceled", cancellationToken)
                                    ?? await billingUpdateService.GetSubscriptionStatusIdAsync("cancelled", cancellationToken);
            if (cancelledStatusId is not null)
            {
                await billingUpdateService.MarkSubscriptionCancelledAsync(subscription.StripeSubscriptionId, cancelledStatusId.Value, cancellationToken);
            }
        }
        else if (userId is not null)
        {
            var planPrice = !string.IsNullOrWhiteSpace(subscription.StripePriceId)
                ? await billingReadService.LookupPlanPriceByStripePriceIdAsync(subscription.StripePriceId, cancellationToken)
                : null;
            var statusId = await billingUpdateService.GetSubscriptionStatusIdAsync(subscription.Status, cancellationToken);

            if (planPrice is not null && statusId is not null)
            {
                await billingUpdateService.UpsertSubscriptionAsync(userId.Value, subscription, planPrice, statusId.Value, cancellationToken);
            }
        }

        return userId;
    }

    private async Task<Guid?> HandlePaymentMethodAsync(StripeEventEnvelope envelope, StripePaymentMethodData paymentMethod, CancellationToken cancellationToken)
    {
        _ = envelope;

        var userId = await billingReadService.GetUserIdByStripeCustomerIdAsync(paymentMethod.StripeCustomerId, cancellationToken);

        if (paymentMethod.Detached)
        {
            await billingUpdateService.DetachPaymentMethodAsync(paymentMethod.StripePaymentMethodId, cancellationToken);
        }
        else if (userId is not null)
        {
            var stripeCustomerRowId = await billingReadService.GetStripeCustomerRowIdAsync(paymentMethod.StripeCustomerId, cancellationToken);
            if (stripeCustomerRowId is null) return userId;
            await billingUpdateService.UpsertPaymentMethodAsync(userId.Value, stripeCustomerRowId.Value, paymentMethod, cancellationToken);
        }

        return userId;
    }

    #region archive — async event-publish (disabled in MVP)
    // HandleEventAsync previously published two events to the messaging outbox:
    //   1. BillingSubscriptionUpdated — consumer: SubscriptionUpdatedHandler →
    //      IEntitlementCacheInvalidatorBusiness.InvalidateAsync(userId). Now inline post-commit.
    //   2. BillingPaymentMethodUpdated — consumer: PaymentMethodUpdatedHandler →
    //      IBillingPaymentMethodCacheInvalidatorBusiness.InvalidateAsync(userId). Now inline post-commit.
    //
    // The two publish helper methods (PublishSubscriptionUpdatedAsync, PublishPaymentMethodUpdatedAsync)
    // were collapsed into the post-commit inline calls above. Userid resolution is now hoisted out of
    // the publish helpers so the inline calls receive the resolved user id.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Billing;
    //
    // private async Task PublishSubscriptionUpdatedAsync(
    //     StripeEventEnvelope envelope, StripeSubscriptionData subscription, Guid? userId, string? planCode, CancellationToken ct)
    // {
    //     var contract = new SubscriptionEventContract(
    //         SubscriptionId: 0, UserId: userId ?? Guid.Empty,
    //         PlanCode: planCode ?? string.Empty, Status: subscription.Status,
    //         TrialEnd: subscription.TrialEnd, CurrentPeriodEnd: subscription.CurrentPeriodEnd,
    //         CancelAtPeriodEnd: subscription.CancelAtPeriodEnd, OccurredAt: DateTimeOffset.UtcNow);
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.BillingSubscriptionUpdated, "billing.subscription", null,
    //         JsonSerializer.Serialize(contract),
    //         $"billing.subscription.updated:{envelope.StripeEventId}", ct);
    // }
    //
    // private async Task PublishPaymentMethodUpdatedAsync(
    //     StripeEventEnvelope envelope, StripePaymentMethodData paymentMethod, Guid? userId, CancellationToken ct)
    // {
    //     var contract = new PaymentMethodEventContract(
    //         UserId: userId ?? Guid.Empty,
    //         StripePaymentMethodId: paymentMethod.StripePaymentMethodId,
    //         EventType: envelope.EventType, OccurredAt: DateTimeOffset.UtcNow);
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.BillingPaymentMethodUpdated, "billing.payment_method", null,
    //         JsonSerializer.Serialize(contract),
    //         $"billing.payment_method.updated:{envelope.StripeEventId}", ct);
    // }
    #endregion
}
