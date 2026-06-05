using Microsoft.Extensions.Caching.Memory;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
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

namespace TrueSpend.Domain.Business.Billing;

public sealed class BillingReadBusiness(IBillingReadService service, IMemoryCache cache) : IBillingReadBusiness
{
    // 30s TTL because cache invalidation does not cross process boundaries today:
    // EntitlementCacheInvalidator / BillingPaymentMethodCacheInvalidator run inside
    // truespend.eventconsumer, while these reads happen inside truespend.api.
    // The mobile foreground-refresh hook + ENTITLEMENT_REQUIRED re-fetch close the
    // window for user-visible decisions; the short TTL bounds backend staleness.
    // Move to IDistributedCache (Redis) when cross-process invalidation is needed.
    private static readonly TimeSpan UserCacheTtl = TimeSpan.FromSeconds(30);

    public async Task<BusinessResponse<CountriesResponse>> GetCountriesAsync(CancellationToken cancellationToken) =>
        BusinessResponse<CountriesResponse>.Ok(new CountriesResponse(await service.GetCountriesAsync(cancellationToken)));

    public async Task<BusinessResponse<PlansResponse>> GetPlansAsync(CancellationToken cancellationToken) =>
        BusinessResponse<PlansResponse>.Ok(new PlansResponse(await service.GetPlansAsync(cancellationToken)));

    public async Task<BusinessResponse<PlanPricesResponse>> GetPricesAsync(OnboardingWorkflowUser user, string? countryCode, string? periodCode, CancellationToken cancellationToken)
    {
        var resolvedCountry = string.IsNullOrWhiteSpace(countryCode)
            ? await service.GetProfileCountryCodeAsync(user.UserId, cancellationToken)
            : countryCode;
        return BusinessResponse<PlanPricesResponse>.Ok(new PlanPricesResponse(await service.GetPricesAsync(resolvedCountry, periodCode, cancellationToken)));
    }

    public async Task<BusinessResponse<PlanFeaturesResponse>> GetFeaturesAsync(CancellationToken cancellationToken) =>
        BusinessResponse<PlanFeaturesResponse>.Ok(new PlanFeaturesResponse(await service.GetFeaturesAsync(cancellationToken)));

    public async Task<BusinessResponse<SubscriptionResponse>> GetSubscriptionAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var key = BillingConstants.SubscriptionCacheKey(user.UserId);
        var value = await GetOrCreateAsync(key, ct => service.GetSubscriptionAsync(user, ct), cancellationToken);
        return BusinessResponse<SubscriptionResponse>.Ok(value);
    }

    public async Task<BusinessResponse<EntitlementsResponse>> GetEntitlementsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var key = BillingConstants.EntitlementsCacheKey(user.UserId);
        var value = await GetOrCreateAsync(key, ct => service.GetEntitlementsAsync(user, ct), cancellationToken);
        return BusinessResponse<EntitlementsResponse>.Ok(value);
    }

    public async Task<BusinessResponse<PaymentMethodsResponse>> GetPaymentMethodsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var key = BillingConstants.PaymentMethodsCacheKey(user.UserId);
        var value = await GetOrCreateAsync(key, async ct => new PaymentMethodsResponse(await service.GetPaymentMethodsAsync(user, ct)), cancellationToken);
        return BusinessResponse<PaymentMethodsResponse>.Ok(value);
    }

    private async Task<T> GetOrCreateAsync<T>(string key, Func<CancellationToken, Task<T>> load, CancellationToken cancellationToken) where T : notnull
    {
        if (cache.TryGetValue(key, out T? cached) && cached is not null)
        {
            return cached;
        }
        var value = await load(cancellationToken);
        cache.Set(key, value, UserCacheTtl);
        return value;
    }
}
