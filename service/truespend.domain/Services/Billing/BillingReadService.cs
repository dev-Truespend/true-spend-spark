using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
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

public sealed class BillingReadService(TrueSpendDbContext db) : IBillingReadService
{
    public Task<IReadOnlyList<Country>> GetCountriesAsync(CancellationToken cancellationToken) =>
        ToReadOnlyAsync(
            (from country in db.Countries.AsNoTracking().Where(x => x.IsSupported)
             join currency in db.Currencies.AsNoTracking() on country.CurrencyId equals currency.Id into currencyJoin
             from currency in currencyJoin.DefaultIfEmpty()
             orderby country.DisplayName
             select new Country(country.Code, country.DisplayName, currency.Code ?? "USD")),
            cancellationToken);

    public Task<IReadOnlyList<Plan>> GetPlansAsync(CancellationToken cancellationToken) =>
        ToReadOnlyAsync(
            db.Plans.AsNoTracking()
                .Where(x => x.IsActive)
                .OrderBy(x => x.Id)
                .Select(x => new Plan(x.Code, x.DisplayName, x.Description, x.TrialDays)),
            cancellationToken);

    public Task<IReadOnlyList<PlanPrice>> GetPricesAsync(string? countryCode, string? periodCode, CancellationToken cancellationToken)
    {
        var q = db.PlanPrices.AsNoTracking().Where(x => x.IsActive);
        if (!string.IsNullOrWhiteSpace(countryCode))
        {
            q = q.Where(x => db.Countries.AsNoTracking().Any(c => c.Id == x.CountryId && c.Code == countryCode));
        }
        if (!string.IsNullOrWhiteSpace(periodCode))
        {
            q = q.Where(x => db.Periods.AsNoTracking().Any(p => p.Id == x.PeriodId && p.Code == periodCode));
        }

        return ToReadOnlyAsync(
            from price in q
            join plan in db.Plans.AsNoTracking() on price.PlanId equals plan.Id
            join period in db.Periods.AsNoTracking() on price.PeriodId equals period.Id
            join country in db.Countries.AsNoTracking() on price.CountryId equals country.Id
            join currency in db.Currencies.AsNoTracking() on country.CurrencyId equals currency.Id into currencyJoin
            from currency in currencyJoin.DefaultIfEmpty()
            select new PlanPrice(
                plan.Code,
                country.Code,
                period.Code,
                new Money(price.Price, currency.Code ?? "USD", $"{currency.Symbol ?? "$"}{price.Price}"),
                price.StripePriceId),
            cancellationToken);
    }

    public Task<IReadOnlyList<PlanFeature>> GetFeaturesAsync(CancellationToken cancellationToken) =>
        ToReadOnlyAsync(
            db.Features.AsNoTracking()
                .OrderBy(x => x.Id)
                .Select(feature => new PlanFeature(
                    feature.Code,
                    feature.DisplayName,
                    feature.Description,
                    feature.ValueType,
                    (from pf in db.PlanFeatures.AsNoTracking().Where(pf => pf.FeatureId == feature.Id)
                     join plan in db.Plans.AsNoTracking() on pf.PlanId equals plan.Id
                     select new PlanFeatureValue(plan.Code, pf.Value)).ToList())),
            cancellationToken);

    public async Task<SubscriptionResponse> GetSubscriptionAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken) =>
        await (from subscription in db.Subscriptions.AsNoTracking().Where(s => s.UserId == user.UserId)
               join plan in db.Plans.AsNoTracking() on subscription.PlanId equals plan.Id
               join status in db.SubscriptionStatuses.AsNoTracking() on subscription.StatusId equals status.Id
               orderby subscription.UpdatedAt descending
               select new SubscriptionResponse(
                   plan.Code,
                   status.Code,
                   subscription.TrialEnd,
                   subscription.CurrentPeriodEnd,
                   subscription.CancelAtPeriodEnd))
            .FirstOrDefaultAsync(cancellationToken) ?? new SubscriptionResponse(BillingConstants.FreePlanCode, "none", null, null, false);

    public async Task<EntitlementsResponse> GetEntitlementsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var subscription = await GetSubscriptionAsync(user, cancellationToken);
        var trialing = string.Equals(subscription.Status, BillingConstants.TrialingStatusCode, StringComparison.OrdinalIgnoreCase);
        var planCode = EntitlementPlanResolver.Resolve(subscription, DateTimeOffset.UtcNow);

        var featureValues = await (
            from plan in db.Plans.AsNoTracking().Where(p => p.Code == planCode)
            join pf in db.PlanFeatures.AsNoTracking() on plan.Id equals pf.PlanId
            join feature in db.Features.AsNoTracking() on pf.FeatureId equals feature.Id
            select new { feature.Code, pf.Value })
            .ToListAsync(cancellationToken);

        var features = featureValues.ToDictionary(x => x.Code, x => x.Value, StringComparer.OrdinalIgnoreCase);

        var unlimitedCards = ParseBoolean(features, BillingConstants.UnlimitedCardsFeatureCode);
        var aiInsightsEnabled = ParseBoolean(features, BillingConstants.AiInsightsEnabledFeatureCode);
        var plaidLinkingEnabled = ParseBoolean(features, BillingConstants.PlaidLinkingEnabledFeatureCode);
        var plaidTransactionsViewEnabled = ParseBoolean(features, BillingConstants.PlaidTransactionsViewEnabledFeatureCode);
        var geofencingEnabled = ParseBoolean(features, BillingConstants.GeofencingEnabledFeatureCode);
        var manualCardLimit = unlimitedCards ? (int?)null : ParseIntegerLimit(features, BillingConstants.ManualCardLimitFeatureCode);
        var plaidCardLimit = unlimitedCards ? (int?)null : ParseIntegerLimit(features, BillingConstants.PlaidCardLimitFeatureCode);
        var geoRecommendationsPerDay = ParseIntegerLimit(features, BillingConstants.GeoRecommendationsPerDayFeatureCode);

        return new EntitlementsResponse(
            planCode,
            trialing,
            trialing ? subscription.TrialEnd : null,
            manualCardLimit,
            plaidCardLimit,
            geoRecommendationsPerDay,
            unlimitedCards,
            aiInsightsEnabled,
            plaidLinkingEnabled,
            plaidTransactionsViewEnabled,
            geofencingEnabled,
            features);
    }

    public Task<IReadOnlyList<PaymentMethod>> GetPaymentMethodsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken) =>
        ToReadOnlyAsync(
            db.PaymentMethods.AsNoTracking()
                .Where(p => p.UserId == user.UserId)
                .OrderByDescending(p => p.IsDefault)
                .ThenByDescending(p => p.UpdatedAt)
                .Select(p => new PaymentMethod(
                    p.Id,
                    p.StripePaymentMethodId,
                    p.Brand,
                    p.LastFour,
                    p.ExpMonth,
                    p.ExpYear,
                    p.IsDefault)),
            cancellationToken);

    public Task<string?> GetStripeCustomerIdAsync(Guid userId, CancellationToken cancellationToken) =>
        db.StripeCustomers.AsNoTracking()
            .Where(c => c.UserId == userId)
            .Select(c => (string?)c.StripeCustomerId)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<Guid?> GetUserIdByStripeCustomerIdAsync(string stripeCustomerId, CancellationToken cancellationToken)
    {
        var result = await db.StripeCustomers.AsNoTracking()
            .Where(c => c.StripeCustomerId == stripeCustomerId)
            .Select(c => new { c.UserId })
            .FirstOrDefaultAsync(cancellationToken);
        return result?.UserId;
    }

    public Task<PlanPriceLookup?> LookupPlanPriceAsync(string planCode, string periodCode, string countryCode, CancellationToken cancellationToken) =>
        (from price in db.PlanPrices.AsNoTracking().Where(p => p.IsActive)
         join plan in db.Plans.AsNoTracking() on price.PlanId equals plan.Id
         join period in db.Periods.AsNoTracking() on price.PeriodId equals period.Id
         join country in db.Countries.AsNoTracking() on price.CountryId equals country.Id
         where plan.Code == planCode && period.Code == periodCode && country.Code == countryCode
         select new PlanPriceLookup(plan.Id, plan.Code, price.Id, plan.TrialDays, price.StripePriceId))
        .FirstOrDefaultAsync(cancellationToken)!;

    public Task<PlanPriceLookup?> LookupPlanPriceByStripePriceIdAsync(string stripePriceId, CancellationToken cancellationToken) =>
        (from price in db.PlanPrices.AsNoTracking().Where(p => p.StripePriceId == stripePriceId)
         join plan in db.Plans.AsNoTracking() on price.PlanId equals plan.Id
         select new PlanPriceLookup(plan.Id, plan.Code, price.Id, plan.TrialDays, price.StripePriceId))
        .FirstOrDefaultAsync(cancellationToken)!;

    public Task<string?> GetProfileEmailAsync(Guid userId, CancellationToken cancellationToken) =>
        db.Profiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => (string?)p.Email)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<string?> GetProfileCountryCodeAsync(Guid userId, CancellationToken cancellationToken) =>
        (from profile in db.Profiles.AsNoTracking()
         join country in db.Countries.AsNoTracking() on profile.CountryId equals country.Id into countryJoin
         from country in countryJoin.DefaultIfEmpty()
         where profile.UserId == userId
         select country != null ? country.Code : null)
        .FirstOrDefaultAsync(cancellationToken);

    public async Task<int?> GetStripeCustomerRowIdAsync(string stripeCustomerId, CancellationToken cancellationToken)
    {
        var result = await db.StripeCustomers.AsNoTracking()
            .Where(c => c.StripeCustomerId == stripeCustomerId)
            .Select(c => new { c.Id })
            .FirstOrDefaultAsync(cancellationToken);
        return result?.Id;
    }

    private static bool ParseBoolean(IReadOnlyDictionary<string, string> features, string code) =>
        features.TryGetValue(code, out var value) && value.Equals("true", StringComparison.OrdinalIgnoreCase);

    private static int? ParseIntegerLimit(IReadOnlyDictionary<string, string> features, string code)
    {
        if (!features.TryGetValue(code, out var value)) return null;
        if (value.Equals("unlimited", StringComparison.OrdinalIgnoreCase)) return null;
        return int.TryParse(value, out var parsed) ? parsed : null;
    }

    private static async Task<IReadOnlyList<T>> ToReadOnlyAsync<T>(IQueryable<T> query, CancellationToken cancellationToken) =>
        await query.ToListAsync(cancellationToken);
}
