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
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class RecommendationsUpdateBusinessTests
{
    [Fact]
    public async Task UpdateCategory_returns_new_recommendation_when_existing_is_found()
    {
        var existing = SampleRecommendation("groceries");
        var refreshed = SampleRecommendation("dining");
        var read = new Mock<IRecommendationsReadService>();
        read.Setup(r => r.GetRecommendationAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(existing);
        var builder = new Mock<IRecommendationBuilderBusiness>();
        builder.Setup(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), existing.Merchant, "dining", 25m, It.IsAny<CancellationToken>()))
            .ReturnsAsync(refreshed);
        var business = new RecommendationsUpdateBusiness(read.Object, builder.Object, new RecommendationsValidator());

        var response = await business.UpdateCategoryAsync(TestUserFactory.AnyUser(),
            new UpdateRecommendationCategoryRequest(1, "dining"), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(refreshed, response.Data!.Recommendation);
    }

    [Fact]
    public async Task UpdateCategory_returns_404_when_recommendation_missing()
    {
        var read = new Mock<IRecommendationsReadService>();
        read.Setup(r => r.GetRecommendationAsync(It.IsAny<int>(), It.IsAny<CancellationToken>())).ReturnsAsync((Recommendation?)null);
        var builder = new Mock<IRecommendationBuilderBusiness>();
        var business = new RecommendationsUpdateBusiness(read.Object, builder.Object, new RecommendationsValidator());

        var response = await business.UpdateCategoryAsync(TestUserFactory.AnyUser(),
            new UpdateRecommendationCategoryRequest(1, "dining"), CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(404, response.StatusCode);
        builder.Verify(b => b.BuildAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Merchant>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateCategory_rejects_blank_category_code()
    {
        var read = new Mock<IRecommendationsReadService>();
        var builder = new Mock<IRecommendationBuilderBusiness>();
        var business = new RecommendationsUpdateBusiness(read.Object, builder.Object, new RecommendationsValidator());

        var response = await business.UpdateCategoryAsync(TestUserFactory.AnyUser(),
            new UpdateRecommendationCategoryRequest(1, " "), CancellationToken.None);

        Assert.False(response.Success);
        read.Verify(r => r.GetRecommendationAsync(It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static Recommendation SampleRecommendation(string categoryCode)
    {
        var merchant = new Merchant(1, "Market", "groceries", false, null);
        var card = new CardSummary(1, "Sapphire", "Chase", "4242", "manual", true, "active", null);
        return new Recommendation(1, merchant, categoryCode,
            new RecommendationCard(card, 2m, new Money(0.5m, "USD", "$0.50"), "reason", 1),
            "best",
            Array.Empty<RecommendationCard>(),
            null);
    }
}
