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
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class RecommendationBuilderBusinessTests
{
    private static OnboardingWorkflowUser User => TestUserFactory.AnyUser();

    [Fact]
    public async Task Build_ranks_highest_reward_card_first_using_db_rates()
    {
        var profile = new[]
        {
            new UserCardReward(
                new CardSummary(1, "American Express Gold Card", "American Express", "1111", "manual", true, "active", null),
                10, 1.0m,
                new Dictionary<string, decimal> { ["groceries"] = 4.0m, ["dining"] = 4.0m },
                "points",
                Array.Empty<MerchantLockedRate>()),
            new UserCardReward(
                new CardSummary(2, "Chase Sapphire Preferred", "Chase", "2222", "manual", false, "active", null),
                11, 1.0m,
                new Dictionary<string, decimal> { ["dining"] = 3.0m, ["travel"] = 2.0m },
                "points",
                Array.Empty<MerchantLockedRate>())
        };
        var (read, catalog, insert) = BuildMocks(profile);
        var builder = new RecommendationBuilderBusiness(read.Object, catalog.Object, insert.Object);

        var result = await builder.BuildAsync(User, SampleMerchant(), "groceries", 50m, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("American Express Gold Card", result!.RecommendedCard.Card.DisplayName);
        Assert.Equal(4.0m, result.RecommendedCard.ExpectedRewardRate);
        Assert.True(result.RecommendedCard.ExpectedRewardRate >= result.RunnerUpCards.First().ExpectedRewardRate);
        Assert.Null(result.CoverageWarning);
    }

    [Fact]
    public async Task Build_points_reward_uses_multiplier_and_category_display_name()
    {
        var profile = new[]
        {
            new UserCardReward(
                new CardSummary(1, "Amex Gold", "American Express", "1111", "manual", true, "active", null),
                10, 1.0m,
                new Dictionary<string, decimal> { ["groceries"] = 4.0m },
                "points",
                Array.Empty<MerchantLockedRate>())
        };
        var (read, catalog, insert) = BuildMocks(profile);
        var builder = new RecommendationBuilderBusiness(read.Object, catalog.Object, insert.Object);

        var result = await builder.BuildAsync(User, SampleMerchant(), "groceries", 50m, CancellationToken.None);

        // points = spend x multiplier (50 x 4 = 200), NOT spend x rate / 100 (which produced "0 points").
        Assert.Equal(200m, result!.RecommendedCard.ExpectedReward.Amount);
        Assert.Equal("200 points", result.RecommendedCard.ExpectedReward.Display);
        // The opaque category code never leaks into user-facing text.
        Assert.Contains("Groceries", result.Reason);
        Assert.DoesNotContain("rcc", result.Reason);
    }

    [Fact]
    public async Task Build_emits_coverage_warning_for_multi_category_merchant()
    {
        var profile = new[]
        {
            new UserCardReward(
                new CardSummary(1, "Chase Freedom Flex", "Chase", "4242", "plaid", true, "active", null),
                12, 1.5m,
                new Dictionary<string, decimal> { ["electronics"] = 2.0m },
                "cash_back",
                Array.Empty<MerchantLockedRate>())
        };
        var (read, catalog, insert) = BuildMocks(profile);
        var merchant = SampleMerchant() with { IsMultiCategory = true };
        var builder = new RecommendationBuilderBusiness(read.Object, catalog.Object, insert.Object);

        var result = await builder.BuildAsync(User, merchant, "electronics", 80m, CancellationToken.None);

        Assert.NotNull(result);
        Assert.NotNull(result!.CoverageWarning);
    }

    [Fact]
    public async Task Build_returns_null_when_user_has_no_cards()
    {
        var (read, catalog, insert) = BuildMocks(Array.Empty<UserCardReward>());
        var builder = new RecommendationBuilderBusiness(read.Object, catalog.Object, insert.Object);

        var result = await builder.BuildAsync(User, SampleMerchant(), "groceries", 25m, CancellationToken.None);

        Assert.Null(result);
    }

    private static (Mock<IRewardRulesReadService> Read, Mock<ICatalogReadService> Catalog, Mock<IRecommendationsInsertService> Insert) BuildMocks(IReadOnlyList<UserCardReward> profile)
    {
        var read = new Mock<IRewardRulesReadService>();
        read.Setup(r => r.GetUserRewardProfileAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>())).ReturnsAsync(profile);
        var catalog = new Mock<ICatalogReadService>();
        catalog.Setup(c => c.GetCategoriesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new[]
        {
            new Category(1, "groceries", "Groceries", null),
            new Category(2, "dining", "Dining", null),
            new Category(3, "electronics", "Electronics", null),
            new Category(4, "travel", "Travel", null)
        });
        var insert = new Mock<IRecommendationsInsertService>();
        insert.Setup(i => i.SaveRecommendationAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<Recommendation>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((OnboardingWorkflowUser _, Recommendation value, string _, CancellationToken _) => value);
        return (read, catalog, insert);
    }

    private static Merchant SampleMerchant() => new(1, "Nearby Market", "groceries", false, "123 Main St");
}
