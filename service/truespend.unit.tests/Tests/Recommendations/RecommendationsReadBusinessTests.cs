using Moq;
using TrueSpend.Domain.Business.Recommendations;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class RecommendationsReadBusinessTests
{
    private static readonly CardSummary SampleCard = new(1, "Sapphire", "Chase", "1234", "manual", true, "active", null);

    private static readonly PortfolioCard[] SamplePortfolio =
    [
        new(SampleCard, new[]
        {
            new PortfolioCategory("dining", "Dining", 3m),
            new PortfolioCategory("travel", "Travel", 2m),
            new PortfolioCategory("base", "Everywhere", 1m)
        })
    ];

    private static RecommendationsReadBusiness CreateBusiness(
        Mock<ICardsReadService>? cards = null,
        Mock<IMerchantsReadService>? merchants = null,
        Mock<IRecommendationBuilderBusiness>? builder = null)
    {
        cards ??= new Mock<ICardsReadService>();
        merchants ??= new Mock<IMerchantsReadService>();
        builder ??= new Mock<IRecommendationBuilderBusiness>();
        // Default portfolio mock — returns the sample so tests don't have to wire it each time.
        cards.Setup(c => c.GetPortfolioAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(SamplePortfolio);
        return new RecommendationsReadBusiness(cards.Object, merchants.Object, builder.Object);
    }

    [Fact]
    public async Task GetHome_returns_add_cards_empty_state_when_user_has_no_cards()
    {
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<CardSummary>());
        var business = CreateBusiness(cards: cards);

        var response = await business.GetHomeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
        Assert.NotNull(response.Data.EmptyState);
        Assert.Equal("add_manual_card", response.Data.EmptyState!.PrimaryActionCode);
        Assert.Null(response.Data.Portfolio);
    }

    [Fact]
    public async Task GetHome_replays_most_recent_merchant_visit_and_returns_portfolio_alongside()
    {
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { SampleCard });

        var merchant = new Merchant(42, "Chipotle", "dining", false, "1 Mission St");
        var visit = new RecentMerchantVisit(merchant, "dining", DateTimeOffset.UtcNow.AddDays(-2));
        var merchants = new Mock<IMerchantsReadService>();
        merchants.Setup(m => m.GetMostRecentVisitAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(visit);

        var recommendation = new Recommendation(
            Id: 7,
            Merchant: merchant,
            CategoryCode: "dining",
            RecommendedCard: new RecommendationCard(
                Card: SampleCard,
                ExpectedRewardRate: 3m,
                ExpectedReward: new Money(0.75m, "USD", "$0.75"),
                Reason: "3x dining",
                Rank: 1),
            Reason: "3x dining",
            RunnerUpCards: Array.Empty<RecommendationCard>(),
            CoverageWarning: null);

        var builder = new Mock<IRecommendationBuilderBusiness>();
        builder.Setup(b => b.BuildAsync(
                It.IsAny<OnboardingWorkflowUser>(),
                merchant,
                "dining",
                It.IsAny<decimal>(),
                RecommendationsConstants.HomeContextCode,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(recommendation);

        var business = CreateBusiness(cards: cards, merchants: merchants, builder: builder);

        var response = await business.GetHomeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.NotNull(response.Data!.Recommendation);
        Assert.Equal(7, response.Data.Recommendation!.Id);
        Assert.Null(response.Data.EmptyState);
        Assert.NotNull(response.Data.Portfolio);
        Assert.Single(response.Data.Portfolio!);
    }

    [Fact]
    public async Task GetHome_returns_portfolio_only_when_cards_exist_but_no_recent_visit()
    {
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { SampleCard });

        var merchants = new Mock<IMerchantsReadService>();
        merchants.Setup(m => m.GetMostRecentVisitAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((RecentMerchantVisit?)null);

        var business = CreateBusiness(cards: cards, merchants: merchants);

        var response = await business.GetHomeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
        Assert.Null(response.Data.EmptyState);
        Assert.NotNull(response.Data.Portfolio);
        Assert.Single(response.Data.Portfolio!);
    }

    [Fact]
    public async Task GetHome_returns_portfolio_only_when_builder_declines_to_replay()
    {
        var cards = new Mock<ICardsReadService>();
        cards.Setup(c => c.GetCardsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { SampleCard });

        var merchant = new Merchant(42, "Chipotle", "dining", false, "1 Mission St");
        var visit = new RecentMerchantVisit(merchant, "dining", DateTimeOffset.UtcNow.AddDays(-2));
        var merchants = new Mock<IMerchantsReadService>();
        merchants.Setup(m => m.GetMostRecentVisitAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<TimeSpan>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(visit);

        var builder = new Mock<IRecommendationBuilderBusiness>();
        builder.Setup(b => b.BuildAsync(
                It.IsAny<OnboardingWorkflowUser>(),
                It.IsAny<Merchant>(),
                It.IsAny<string>(),
                It.IsAny<decimal>(),
                It.IsAny<string>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((Recommendation?)null);

        var business = CreateBusiness(cards: cards, merchants: merchants, builder: builder);

        var response = await business.GetHomeAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
        Assert.Null(response.Data.EmptyState);
        Assert.NotNull(response.Data.Portfolio);
    }
}
