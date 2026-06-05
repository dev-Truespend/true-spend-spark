using Moq;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
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
    public async Task GetCards_uses_basic_limit_for_basic_plan()
    {
        var cards = new[] { Card("plaid"), Card("manual") };
        var service = NewService(cards, "basic");
        var business = new CardsReadBusiness(service.Object);

        var response = await business.GetCardsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(3, response.Data!.Limits.PlaidLimit);
        Assert.Equal(3, response.Data.Limits.ManualLimit);
        Assert.False(response.Data.Limits.Unlimited);
    }

    [Fact]
    public async Task GetCards_uses_unlimited_limit_for_pro_plan()
    {
        var service = NewService(new[] { Card("plaid") }, "pro");
        var business = new CardsReadBusiness(service.Object);

        var response = await business.GetCardsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Limits.PlaidLimit);
        Assert.True(response.Data.Limits.Unlimited);
    }

    [Fact]
    public async Task GetCardLimits_counts_only_active_sources()
    {
        var cards = new[] { Card("plaid"), Card("plaid"), Card("manual") };
        var service = NewService(cards, "basic");
        var business = new CardsReadBusiness(service.Object);

        var response = await business.GetCardLimitsAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.Equal(2, response.Data!.PlaidUsed);
        Assert.Equal(1, response.Data.ManualUsed);
    }

    private static Mock<ICardsReadService> NewService(CardSummary[] cards, string planCode)
    {
        var service = new Mock<ICardsReadService>();
        service.Setup(s => s.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cards);
        service.Setup(s => s.CurrentPlanCodeAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(planCode);
        return service;
    }
}
