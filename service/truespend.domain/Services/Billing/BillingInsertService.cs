using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Billing;
using TrueSpend.Domain.Enums;
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

namespace TrueSpend.Domain.Services.Billing;

public sealed class BillingInsertService(TrueSpendDbContext db) : IBillingInsertService
{
    public async Task<SubscriptionResponse> RecordTrialingSubscriptionAsync(OnboardingWorkflowUser user, string planCode, CancellationToken cancellationToken)
    {
        var plan = await db.Plans.AsNoTracking().FirstOrDefaultAsync(p => p.Code == planCode, cancellationToken)
            ?? throw new InvalidOperationException($"Plan not found: {planCode}");

        var planPrice = await db.PlanPrices.AsNoTracking()
            .Where(pp => pp.PlanId == plan.Id && pp.IsActive)
            .OrderBy(pp => pp.Id)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException($"No active plan price for {planCode}");

        var statusId = await db.SubscriptionStatuses.AsNoTracking()
            .Where(s => s.Code == "trialing")
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (statusId == 0) statusId = (short)SubscriptionStatusEnum.Trialing;

        var now = DateTimeOffset.UtcNow;
        var trialEnd = now.AddDays(plan.TrialDays);
        var subscription = new SubscriptionEntity
        {
            UserId = user.UserId,
            PlanId = plan.Id,
            PlanPriceId = planPrice.Id,
            StripeSubscriptionId = $"trial_{Guid.NewGuid():N}",
            StatusId = statusId,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = trialEnd,
            TrialEnd = trialEnd,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Subscriptions.Add(subscription);
        await db.SaveChangesAsync(cancellationToken);

        return new SubscriptionResponse(plan.Code, "trialing", trialEnd, trialEnd, false);
    }
}
