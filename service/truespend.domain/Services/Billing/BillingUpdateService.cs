using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Billing;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.ServiceInterfaces.Billing;

namespace TrueSpend.Domain.Services.Billing;

public sealed class BillingUpdateService(TrueSpendDbContext db) : IBillingUpdateService
{
    public async Task UpsertStripeCustomerAsync(Guid userId, StripeCustomerData payload, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = await db.StripeCustomers.FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);
        if (existing is null)
        {
            db.StripeCustomers.Add(new StripeCustomerEntity
            {
                UserId = userId,
                StripeCustomerId = payload.StripeCustomerId,
                Email = payload.Email,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            existing.StripeCustomerId = payload.StripeCustomerId;
            if (!string.IsNullOrWhiteSpace(payload.Email))
            {
                existing.Email = payload.Email;
            }
            existing.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<int?> UpsertSubscriptionAsync(Guid userId, StripeSubscriptionData payload, PlanPriceLookup planPrice, short statusId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var existing = await db.Subscriptions.FirstOrDefaultAsync(s => s.StripeSubscriptionId == payload.StripeSubscriptionId, cancellationToken);

        if (existing is null)
        {
            var entity = new SubscriptionEntity
            {
                UserId = userId,
                PlanId = planPrice.PlanId,
                PlanPriceId = planPrice.PlanPriceId,
                StripeSubscriptionId = payload.StripeSubscriptionId,
                StatusId = statusId,
                CurrentPeriodStart = payload.CurrentPeriodStart,
                CurrentPeriodEnd = payload.CurrentPeriodEnd,
                TrialEnd = payload.TrialEnd,
                CancelAtPeriodEnd = payload.CancelAtPeriodEnd,
                CanceledAt = payload.CanceledAt,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Subscriptions.Add(entity);
            await db.SaveChangesAsync(cancellationToken);
            return entity.Id;
        }

        existing.PlanId = planPrice.PlanId;
        existing.PlanPriceId = planPrice.PlanPriceId;
        existing.StatusId = statusId;
        existing.CurrentPeriodStart = payload.CurrentPeriodStart;
        existing.CurrentPeriodEnd = payload.CurrentPeriodEnd;
        existing.TrialEnd = payload.TrialEnd;
        existing.CancelAtPeriodEnd = payload.CancelAtPeriodEnd;
        existing.CanceledAt = payload.CanceledAt;
        existing.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        return existing.Id;
    }

    public async Task MarkSubscriptionCancelledAsync(string stripeSubscriptionId, short cancelledStatusId, CancellationToken cancellationToken)
    {
        var existing = await db.Subscriptions.FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscriptionId, cancellationToken);
        if (existing is null) return;

        var now = DateTimeOffset.UtcNow;
        existing.StatusId = cancelledStatusId;
        existing.CanceledAt = now;
        existing.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task UpsertPaymentMethodAsync(Guid userId, int stripeCustomerRowId, StripePaymentMethodData payload, CancellationToken cancellationToken)
    {
        if (payload.Detached)
        {
            await DetachPaymentMethodAsync(payload.StripePaymentMethodId, cancellationToken);
            return;
        }

        var now = DateTimeOffset.UtcNow;
        var existing = await db.PaymentMethods.FirstOrDefaultAsync(p => p.StripePaymentMethodId == payload.StripePaymentMethodId, cancellationToken);

        if (existing is null)
        {
            db.PaymentMethods.Add(new PaymentMethodEntity
            {
                UserId = userId,
                StripeCustomerId = stripeCustomerRowId,
                StripePaymentMethodId = payload.StripePaymentMethodId,
                Brand = payload.Brand,
                LastFour = payload.LastFour,
                ExpMonth = payload.ExpMonth,
                ExpYear = payload.ExpYear,
                IsDefault = false,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            existing.StripeCustomerId = stripeCustomerRowId;
            existing.Brand = payload.Brand;
            existing.LastFour = payload.LastFour;
            existing.ExpMonth = payload.ExpMonth;
            existing.ExpYear = payload.ExpYear;
            existing.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DetachPaymentMethodAsync(string stripePaymentMethodId, CancellationToken cancellationToken)
    {
        var existing = await db.PaymentMethods.FirstOrDefaultAsync(p => p.StripePaymentMethodId == stripePaymentMethodId, cancellationToken);
        if (existing is null) return;
        db.PaymentMethods.Remove(existing);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<short?> GetSubscriptionStatusIdAsync(string statusCode, CancellationToken cancellationToken)
    {
        var status = await db.SubscriptionStatuses.AsNoTracking()
            .Where(s => s.Code == statusCode)
            .Select(s => new { s.Id })
            .FirstOrDefaultAsync(cancellationToken);
        return status?.Id;
    }
}
