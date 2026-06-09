using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.App;

namespace TrueSpend.Domain.Business.Billing;

public sealed class ManualResyncQuotaBusiness(
    IUserDailyUsageService usageService,
    IEntitlementGuard entitlementGuard,
    IOptions<ManualResyncOptions> options) : IManualResyncQuotaBusiness
{
    public async Task<BusinessResponse<ManualResyncQuotaStatus>> GetStatusAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var isPro = await entitlementGuard.HasFeatureAsync(user, BillingConstants.ManualResyncEnabledFeatureCode, cancellationToken);
        var limit = options.Value.ProResyncDailyLimit;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var used = await usageService.GetPlaidResyncCountAsync(user.UserId, today, cancellationToken);
        return BusinessResponse<ManualResyncQuotaStatus>.Ok(
            new ManualResyncQuotaStatus(isPro, limit, used, Math.Max(0, limit - used)));
    }

    public async Task<ManualResyncConsumeResult> TryConsumeAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        // Pro gate: throws EntitlementRequiredAppException (→ 403 upgrade prompt) for non-Pro users.
        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.ManualResyncEnabledFeatureCode, cancellationToken);

        var limit = options.Value.ProResyncDailyLimit;
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var used = await usageService.GetPlaidResyncCountAsync(user.UserId, today, cancellationToken);
        if (used >= limit)
            return new ManualResyncConsumeResult(false, new ManualResyncQuotaStatus(true, limit, used, 0));

        var newCount = await usageService.IncrementPlaidResyncCountAsync(user.UserId, today, DateTimeOffset.UtcNow, cancellationToken);
        return new ManualResyncConsumeResult(true, new ManualResyncQuotaStatus(true, limit, newCount, Math.Max(0, limit - newCount)));
    }
}
