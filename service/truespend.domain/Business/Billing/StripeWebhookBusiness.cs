using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Events.Billing;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
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
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork) : IStripeWebhookBusiness
{
    public async Task<BusinessResponse<StripeWebhookResult>> HandleEventAsync(StripeWebhookInput input, CancellationToken cancellationToken)
    {
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
            await HandleSubscriptionAsync(envelope, subscription, cancellationToken);
        }

        if (envelope.PaymentMethod is { } paymentMethod)
        {
            await HandlePaymentMethodAsync(envelope, paymentMethod, cancellationToken);
        }

        await tx.CommitAsync(cancellationToken);

        return BusinessResponse<StripeWebhookResult>.Ok(new StripeWebhookResult(true, false));
    }

    private async Task HandleCustomerAsync(StripeCustomerData customer, CancellationToken cancellationToken)
    {
        var userId = customer.UserId ?? await billingReadService.GetUserIdByStripeCustomerIdAsync(customer.StripeCustomerId, cancellationToken);
        if (userId is null) return;
        await billingUpdateService.UpsertStripeCustomerAsync(userId.Value, customer, cancellationToken);
    }

    private async Task HandleSubscriptionAsync(StripeEventEnvelope envelope, StripeSubscriptionData subscription, CancellationToken cancellationToken)
    {
        var userId = await billingReadService.GetUserIdByStripeCustomerIdAsync(subscription.StripeCustomerId, cancellationToken);
        string? planCode = null;

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
            planCode = planPrice?.PlanCode;

            if (planPrice is not null && statusId is not null)
            {
                await billingUpdateService.UpsertSubscriptionAsync(userId.Value, subscription, planPrice, statusId.Value, cancellationToken);
            }
        }

        await PublishSubscriptionUpdatedAsync(envelope, subscription, userId, planCode, cancellationToken);
    }

    private async Task HandlePaymentMethodAsync(StripeEventEnvelope envelope, StripePaymentMethodData paymentMethod, CancellationToken cancellationToken)
    {
        var userId = await billingReadService.GetUserIdByStripeCustomerIdAsync(paymentMethod.StripeCustomerId, cancellationToken);

        if (paymentMethod.Detached)
        {
            await billingUpdateService.DetachPaymentMethodAsync(paymentMethod.StripePaymentMethodId, cancellationToken);
        }
        else if (userId is not null)
        {
            var stripeCustomerRowId = await billingReadService.GetStripeCustomerRowIdAsync(paymentMethod.StripeCustomerId, cancellationToken);
            if (stripeCustomerRowId is null) return;
            await billingUpdateService.UpsertPaymentMethodAsync(userId.Value, stripeCustomerRowId.Value, paymentMethod, cancellationToken);
        }

        await PublishPaymentMethodUpdatedAsync(envelope, paymentMethod, userId, cancellationToken);
    }

    private async Task PublishSubscriptionUpdatedAsync(StripeEventEnvelope envelope, StripeSubscriptionData subscription, Guid? userId, string? planCode, CancellationToken cancellationToken)
    {
        var contract = new SubscriptionEventContract(
            SubscriptionId: 0,
            UserId: userId ?? Guid.Empty,
            PlanCode: planCode ?? string.Empty,
            Status: subscription.Status,
            TrialEnd: subscription.TrialEnd,
            CurrentPeriodEnd: subscription.CurrentPeriodEnd,
            CancelAtPeriodEnd: subscription.CancelAtPeriodEnd,
            OccurredAt: DateTimeOffset.UtcNow);

        await messagingInsertService.EnqueueOutboxEventAsync(
            EventTypes.BillingSubscriptionUpdated,
            "billing.subscription",
            null,
            JsonSerializer.Serialize(contract),
            $"billing.subscription.updated:{envelope.StripeEventId}",
            cancellationToken);
    }

    private async Task PublishPaymentMethodUpdatedAsync(StripeEventEnvelope envelope, StripePaymentMethodData paymentMethod, Guid? userId, CancellationToken cancellationToken)
    {
        var contract = new PaymentMethodEventContract(
            UserId: userId ?? Guid.Empty,
            StripePaymentMethodId: paymentMethod.StripePaymentMethodId,
            EventType: envelope.EventType,
            OccurredAt: DateTimeOffset.UtcNow);

        await messagingInsertService.EnqueueOutboxEventAsync(
            EventTypes.BillingPaymentMethodUpdated,
            "billing.payment_method",
            null,
            JsonSerializer.Serialize(contract),
            $"billing.payment_method.updated:{envelope.StripeEventId}",
            cancellationToken);
    }
}
