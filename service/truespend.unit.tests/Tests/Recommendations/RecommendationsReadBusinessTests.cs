using Moq;
using TrueSpend.Domain.Business.Recommendations;
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

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class RecommendationsReadBusinessTests
{
    [Fact]
    public async Task GetHome_returns_empty_state_when_user_has_no_cards()
    {
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CardSummary>());
        var business = new RecommendationsReadBusiness(cards.Object);

        var response = await business.GetHomeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
        Assert.NotNull(response.Data.EmptyState);
    }

    [Fact]
    public async Task GetHome_returns_no_recommendation_when_user_has_cards_without_detected_merchant()
    {
        var card = new CardSummary(1, "Sapphire", "Chase", "1234", "manual", true, "active", null);
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { card });
        var business = new RecommendationsReadBusiness(cards.Object);

        var response = await business.GetHomeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
        Assert.Null(response.Data.EmptyState);
    }
}
