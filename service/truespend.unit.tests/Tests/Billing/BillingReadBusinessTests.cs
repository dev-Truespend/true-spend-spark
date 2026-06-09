using Microsoft.Extensions.Caching.Memory;
using Moq;
using TrueSpend.Domain.Business.Billing;
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
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Billing;

public sealed class BillingReadBusinessTests
{
    [Fact]
    public async Task GetEntitlements_passes_through_pro_response_from_service()
    {
        var service = new Mock<IBillingReadService>();
        service.Setup(s => s.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EntitlementsResponse(
                PlanCode: "pro",
                Trialing: false,
                TrialEndsAt: null,
                ManualCardLimit: null,
                PlaidCardLimit: null,
                GeoRecommendationsPerDay: null,
                UnlimitedCards: true,
                AiInsightsEnabled: true,
                PlaidLinkingEnabled: true,
                PlaidTransactionsViewEnabled: true,
                GeofencingEnabled: true,
                Features: new Dictionary<string, string>
                {
                    ["manual_card_limit"] = "unlimited",
                    ["plaid_card_limit"] = "unlimited",
                    ["geo_recommendations_per_day"] = "unlimited",
                    ["ai_insights_enabled"] = "true",
                    ["unlimited_cards"] = "true",
                    ["plaid_linking_enabled"] = "true",
                    ["plaid_transactions_view_enabled"] = "true",
                    ["geofencing_enabled"] = "true"
                }));
        var business = new BillingReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var response = await business.GetEntitlementsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("pro", response.Data!.PlanCode);
        Assert.True(response.Data.UnlimitedCards);
        Assert.True(response.Data.AiInsightsEnabled);
        Assert.Null(response.Data.ManualCardLimit);
        Assert.Null(response.Data.PlaidCardLimit);
        Assert.Equal("unlimited", response.Data.Features["manual_card_limit"]);
    }

    [Fact]
    public async Task GetPrices_passes_prices_through_with_country()
    {
        var service = new Mock<IBillingReadService>();
        service.Setup(s => s.GetPricesAsync("US", "annual", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new PlanPrice("pro", "US", "annual", new Money(99.99m, "USD", "$99.99"), "price_pro_annual") });
        var business = new BillingReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var response = await business.GetPricesAsync(TestUserFactory.AnyUser(), "US", "annual", CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.Plans);
        Assert.Equal("US", response.Data.Plans[0].CountryCode);
        service.Verify(s => s.GetPricesAsync("US", "annual", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetPaymentMethods_wraps_service_results_in_response()
    {
        var service = new Mock<IBillingReadService>();
        service.Setup(s => s.GetPaymentMethodsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new PaymentMethod(1, "pm_123", "visa", "4242", 12, 2030, true) });
        var business = new BillingReadBusiness(service.Object, new MemoryCache(new MemoryCacheOptions()));

        var response = await business.GetPaymentMethodsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Single(response.Data!.PaymentMethods);
        Assert.Equal("pm_123", response.Data.PaymentMethods[0].StripePaymentMethodId);
    }
}
