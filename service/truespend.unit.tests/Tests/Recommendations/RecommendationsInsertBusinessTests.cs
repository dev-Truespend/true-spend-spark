using Moq;
using TrueSpend.Domain.Business.Recommendations;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
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
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class RecommendationsInsertBusinessTests
{
    private static Merchant SampleMerchant() => new(1, "Target", "home_goods", true, "Detected nearby");

    private static Recommendation SampleRecommendation(Merchant merchant, string categoryCode) =>
        new(1, merchant, categoryCode,
            new RecommendationCard(
                new CardSummary(1, "Chase Freedom Flex", "Chase", "4242", "plaid", true, "active", null),
                3m,
                new Money(0.75m, "USD", "$0.75"),
                "Best electronics rate",
                1),
            "Best card",
            Array.Empty<RecommendationCard>(),
            null);

    [Fact]
    public async Task GetInStoreRecommendation_returns_recommendation_when_merchant_resolves()
    {
        var merchant = SampleMerchant();
        var recommendation = SampleRecommendation(merchant, "electronics");
        var merchants = new Mock<IMerchantsReadService>();
        merchants.Setup(m => m.GetMerchantAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        var builder = new Mock<IRecommendationBuilderBusiness>();
        builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "electronics", 80m, It.IsAny<CancellationToken>()))
            .ReturnsAsync(recommendation);
        var business = new RecommendationsInsertBusiness(merchants.Object, builder.Object, new RecommendationsValidator());

        var response = await business.GetInStoreRecommendationAsync(TestUserFactory.AnyUser(),
            new InStoreRecommendationRequest(1, "electronics", 80m), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(recommendation, response.Data!.Recommendation);
    }

    [Fact]
    public async Task RefreshRecommendation_falls_back_to_merchant_category_when_not_supplied()
    {
        var merchant = SampleMerchant();
        var recommendation = SampleRecommendation(merchant, "home_goods");
        var merchants = new Mock<IMerchantsReadService>();
        merchants.Setup(m => m.GetMerchantAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(merchant);
        var builder = new Mock<IRecommendationBuilderBusiness>();
        builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "home_goods", 25m, It.IsAny<CancellationToken>()))
            .ReturnsAsync(recommendation);
        var business = new RecommendationsInsertBusiness(merchants.Object, builder.Object, new RecommendationsValidator());

        var response = await business.RefreshRecommendationAsync(TestUserFactory.AnyUser(),
            new RefreshRecommendationRequest(1, null), CancellationToken.None);

        Assert.True(response.Success);
        builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), merchant, "home_goods", 25m, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetInStoreRecommendation_returns_404_when_merchant_missing()
    {
        var merchants = new Mock<IMerchantsReadService>();
        merchants.Setup(m => m.GetMerchantAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Merchant?)null);
        var builder = new Mock<IRecommendationBuilderBusiness>();
        var business = new RecommendationsInsertBusiness(merchants.Object, builder.Object, new RecommendationsValidator());

        var response = await business.GetInStoreRecommendationAsync(TestUserFactory.AnyUser(),
            new InStoreRecommendationRequest(1, "electronics", 80m), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
        builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task GetInStoreRecommendation_rejects_invalid_merchant_id()
    {
        var merchants = new Mock<IMerchantsReadService>();
        var builder = new Mock<IRecommendationBuilderBusiness>();
        var business = new RecommendationsInsertBusiness(merchants.Object, builder.Object, new RecommendationsValidator());

        var response = await business.GetInStoreRecommendationAsync(TestUserFactory.AnyUser(),
            new InStoreRecommendationRequest(0, "electronics", null), CancellationToken.None);

        Assert.False(response.Success);
        merchants.Verify(m => m.GetMerchantAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
