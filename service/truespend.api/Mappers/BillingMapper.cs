using System.Text.Json;
using TrueSpend.Api.ViewModels.Billing;
using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Geo;
using DomainCountries = TrueSpend.Domain.Models.Catalog.CountriesResponse;
using DomainCountry = TrueSpend.Domain.Models.Catalog.Country;
using DomainPlans = TrueSpend.Domain.Models.Billing.PlansResponse;
using DomainPlan = TrueSpend.Domain.Models.Billing.Plan;
using DomainPrices = TrueSpend.Domain.Models.Billing.PlanPricesResponse;
using DomainPrice = TrueSpend.Domain.Models.Billing.PlanPrice;
using DomainMoney = TrueSpend.Domain.Models.Common.Money;
using DomainFeatures = TrueSpend.Domain.Models.Billing.PlanFeaturesResponse;
using DomainFeature = TrueSpend.Domain.Models.Billing.PlanFeature;
using DomainFeatureValue = TrueSpend.Domain.Models.Billing.PlanFeatureValue;
using DomainCheckout = TrueSpend.Domain.Models.Billing.CreateCheckoutSessionRequest;
using DomainHosted = TrueSpend.Domain.Models.Billing.HostedBillingResponse;
using DomainSubscription = TrueSpend.Domain.Models.Billing.SubscriptionResponse;
using DomainEntitlements = TrueSpend.Domain.Models.Billing.EntitlementsResponse;
using DomainPaymentMethods = TrueSpend.Domain.Models.Billing.PaymentMethodsResponse;
using DomainPaymentMethod = TrueSpend.Domain.Models.Billing.PaymentMethod;
using DomainStripeWebhookInput = TrueSpend.Domain.Models.Billing.StripeWebhookInput;
using DomainStripeWebhookResult = TrueSpend.Domain.Models.Billing.StripeWebhookResult;

namespace TrueSpend.Api.Mappers;

public interface IBillingMapper
{
    DomainCheckout ToDomain(CreateCheckoutSessionRequestVm request);
    CountriesResponseVm ToCountries(DomainCountries domain);
    PlansResponseVm ToPlans(DomainPlans domain);
    PlanPricesResponseVm ToPrices(DomainPrices domain);
    PlanFeaturesResponseVm ToFeatures(DomainFeatures domain);
    HostedBillingResponseVm ToHosted(DomainHosted domain);
    SubscriptionResponseVm ToSubscription(DomainSubscription domain);
    EntitlementsResponseVm ToEntitlements(DomainEntitlements domain);
    PaymentMethodsResponseVm ToPaymentMethods(DomainPaymentMethods domain);
    DomainStripeWebhookInput ParseStripeWebhook(string rawBody);
    WebhookAckResponseVm ToWebhookAck(DomainStripeWebhookResult result);
}

public sealed class BillingMapper : IBillingMapper
{
    public DomainCheckout ToDomain(CreateCheckoutSessionRequestVm request) =>
        new(request.PlanCode, request.PeriodCode, request.ReturnContextCode);

    public CountriesResponseVm ToCountries(DomainCountries domain) =>
        new(domain.Countries.Select(country => new CountryVm(country.Code, country.DisplayName, country.CurrencyCode)).ToArray());

    public PlansResponseVm ToPlans(DomainPlans domain) =>
        new(domain.Plans.Select(plan => new PlanVm(plan.Code, plan.DisplayName, plan.Description, plan.TrialDays)).ToArray());

    public PlanPricesResponseVm ToPrices(DomainPrices domain) =>
        new(domain.Plans.Select(price => new PlanPriceVm(price.PlanCode, price.CountryCode, price.PeriodCode, ToMoney(price.Amount), price.StripePriceId)).ToArray());

    public PlanFeaturesResponseVm ToFeatures(DomainFeatures domain) =>
        new(domain.Features.Select(feature => new PlanFeatureVm(
            feature.Code,
            feature.DisplayName,
            feature.Description,
            feature.ValueType,
            feature.ValuesByPlan.Select(value => new PlanFeatureValueVm(value.PlanCode, value.Value)).ToArray())).ToArray());

    public HostedBillingResponseVm ToHosted(DomainHosted domain) => new(domain.Url);

    public SubscriptionResponseVm ToSubscription(DomainSubscription domain) =>
        new(domain.PlanCode, domain.Status, domain.TrialEnd, domain.CurrentPeriodEnd, domain.CancelAtPeriodEnd);

    public EntitlementsResponseVm ToEntitlements(DomainEntitlements domain) =>
        new(domain.PlanCode,
            domain.Trialing,
            domain.TrialEndsAt,
            domain.CardLinkLimit,
            domain.UnlimitedCards,
            domain.AiInsightsEnabled,
            domain.PlaidLinkingEnabled,
            domain.PlaidTransactionsViewEnabled,
            domain.GeofencingEnabled,
            domain.Features.ToDictionary(kv => kv.Key, kv => (object)kv.Value));

    public PaymentMethodsResponseVm ToPaymentMethods(DomainPaymentMethods domain) =>
        new(domain.PaymentMethods.Select(pm => new PaymentMethodVm(
            pm.Id,
            pm.StripePaymentMethodId,
            pm.Brand,
            pm.LastFour,
            pm.ExpMonth,
            pm.ExpYear,
            pm.IsDefault)).ToArray());

    public WebhookAckResponseVm ToWebhookAck(DomainStripeWebhookResult result) =>
        new(Received: true, Deduplicated: result.AlreadyProcessed);

    public DomainStripeWebhookInput ParseStripeWebhook(string rawBody)
    {
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return new DomainStripeWebhookInput(string.Empty, string.Empty, "{}");
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;
        var stripeEventId = root.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String
            ? idEl.GetString() ?? string.Empty
            : string.Empty;
        var eventType = root.TryGetProperty("type", out var typeEl) && typeEl.ValueKind == JsonValueKind.String
            ? typeEl.GetString() ?? string.Empty
            : string.Empty;
        return new DomainStripeWebhookInput(stripeEventId, eventType, rawBody);
    }

    private static MoneyVm ToMoney(DomainMoney money) => new(money.Amount, money.CurrencyCode, money.Display);
}
