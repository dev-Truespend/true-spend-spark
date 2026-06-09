using Moq;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Cards;

public sealed class CardsReadBusinessTests
{
    private static CardSummary Card(string source) =>
        new(1, "Sample", "Bank", "1234", source, false, "active", null);

    [Fact]
    public async Task GetCards_uses_per_source_limits_for_basic_plan()
    {
        var cards = new[] { Card("plaid"), Card("manual") };
        var business = NewBusiness(cards, Basic());

        var response = await business.GetCardsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(3, response.Data!.Limits.PlaidLimit);
        Assert.Equal(3, response.Data.Limits.ManualLimit);
        Assert.False(response.Data.Limits.Unlimited);
    }

    [Fact]
    public async Task GetCards_uses_unlimited_limit_for_pro_plan()
    {
        var business = NewBusiness(new[] { Card("plaid") }, Pro());

        var response = await business.GetCardsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Limits.PlaidLimit);
        Assert.True(response.Data.Limits.Unlimited);
    }

    [Fact]
    public async Task GetCardLimits_counts_only_active_sources()
    {
        var cards = new[] { Card("plaid"), Card("plaid"), Card("manual") };
        var business = NewBusiness(cards, Basic());

        var response = await business.GetCardLimitsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.Equal(2, response.Data!.PlaidUsed);
        Assert.Equal(1, response.Data.ManualUsed);
    }

    private static EntitlementsResponse Basic() => new(
        "basic", false, null, ManualCardLimit: 3, PlaidCardLimit: 3, GeoRecommendationsPerDay: 3,
        UnlimitedCards: false, AiInsightsEnabled: false, PlaidLinkingEnabled: true,
        PlaidTransactionsViewEnabled: true, GeofencingEnabled: true, Features: new Dictionary<string, string>());

    private static EntitlementsResponse Pro() => new(
        "pro", false, null, ManualCardLimit: null, PlaidCardLimit: null, GeoRecommendationsPerDay: null,
        UnlimitedCards: true, AiInsightsEnabled: true, PlaidLinkingEnabled: true,
        PlaidTransactionsViewEnabled: true, GeofencingEnabled: true, Features: new Dictionary<string, string>());

    private static CardsReadBusiness NewBusiness(CardSummary[] cards, EntitlementsResponse entitlements)
    {
        var service = new Mock<ICardsReadService>();
        service.Setup(s => s.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cards);

        var billing = new Mock<IBillingReadBusiness>();
        billing.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(BusinessResponse<EntitlementsResponse>.Ok(entitlements));

        return new CardsReadBusiness(service.Object, billing.Object);
    }
}
