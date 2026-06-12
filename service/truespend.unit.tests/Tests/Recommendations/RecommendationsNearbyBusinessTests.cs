using Moq;
using TrueSpend.Domain.Business.Recommendations;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

// Foreground "open app -> nearby best card" (03). Reuses the geo place-match (10a) then the shared
// best-card builder, minus the notification/gating. High/Medium surface a card; Low/None return empty.
public sealed class RecommendationsNearbyBusinessTests
{
    private static readonly NearbyRecommendationRequest Request = new(37.7929m, -122.3971m, 20m, null);

    private static Merchant SampleMerchant() => new(7, "Chipotle", "dining", false, null);

    private static Recommendation SampleRecommendation(Merchant merchant) =>
        new(1, merchant, merchant.CategoryCode,
            new RecommendationCard(
                new CardSummary(1, "Amex Gold", "Amex", "4242", "plaid", true, "active", null),
                4m,
                new Money(1m, "USD", "$1.00"),
                "Best dining rate",
                1),
            "Best card",
            Array.Empty<RecommendationCard>(),
            null);

    private static (RecommendationsInsertBusiness Sut, Mock<IGeoPlaceMatchBusiness> PlaceMatch, Mock<IMerchantResolveBusiness> Resolve, Mock<IRecommendationBuilderBusiness> Builder) Build()
    {
        var placeMatch = new Mock<IGeoPlaceMatchBusiness>();
        var resolve = new Mock<IMerchantResolveBusiness>();
        var builder = new Mock<IRecommendationBuilderBusiness>();
        var sut = new RecommendationsInsertBusiness(
            Mock.Of<IMerchantsReadService>(), builder.Object, placeMatch.Object, resolve.Object, new RecommendationsValidator());
        return (sut, placeMatch, resolve, builder);
    }

    [Fact]
    public async Task High_confidence_resolves_merchant_and_builds_recommendation()
    {
        var (sut, placeMatch, resolve, builder) = Build();
        var merchant = SampleMerchant();
        var recommendation = SampleRecommendation(merchant);
        placeMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-1", ArrivalConfidenceTierEnum.High));
        resolve.Setup(r => r.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "dining", 25m, RecommendationsConstants.InStoreContextCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync(recommendation);

        var response = await sut.GetNearbyRecommendationAsync(TestUserFactory.AnyUser(), Request, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(recommendation, response.Data!.Recommendation);
    }

    [Fact]
    public async Task Low_confidence_returns_empty_without_resolving_merchant()
    {
        var (sut, placeMatch, resolve, builder) = Build();
        placeMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Mall", GeoConstants.ProviderCustom, "fsq-2", ArrivalConfidenceTierEnum.Low));

        var response = await sut.GetNearbyRecommendationAsync(TestUserFactory.AnyUser(), Request, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
        resolve.Verify(r => r.ResolveByNameAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
        builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Match_but_no_eligible_cards_returns_empty()
    {
        var (sut, placeMatch, resolve, builder) = Build();
        var merchant = SampleMerchant();
        placeMatch.Setup(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlaceMatch(true, "Chipotle", GeoConstants.ProviderFoursquare, "fsq-1", ArrivalConfidenceTierEnum.High));
        resolve.Setup(r => r.ResolveByNameAsync("Chipotle", It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "dining", It.IsAny<decimal>(), RecommendationsConstants.InStoreContextCode, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Recommendation?)null);

        var response = await sut.GetNearbyRecommendationAsync(TestUserFactory.AnyUser(), Request, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Null(response.Data!.Recommendation);
    }

    [Fact]
    public async Task Rejects_out_of_range_coordinates()
    {
        var (sut, placeMatch, _, _) = Build();

        var response = await sut.GetNearbyRecommendationAsync(
            TestUserFactory.AnyUser(), new NearbyRecommendationRequest(120m, -122m, null, null), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        placeMatch.Verify(p => p.ResolveAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<decimal?>(), It.IsAny<int?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
