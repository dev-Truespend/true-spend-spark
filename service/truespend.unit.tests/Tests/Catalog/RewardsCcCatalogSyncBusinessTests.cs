using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Catalog;

public sealed class RewardsCcCatalogSyncBusinessTests
{
    [Fact]
    public async Task SyncSeededCards_runs_full_catalog_when_seed_is_empty()
    {
        var now = DateTimeOffset.UtcNow;
        var allCards = new[] { new RapidApiSearchResult { CardKey = "amex-gold", CardIssuer = "American Express", CardName = "Gold Card" } };
        var detail = new RapidApiCardDetail
        {
            CardKey = "amex-gold",
            CardIssuer = "American Express",
            CardName = "Gold Card",
            CardNetwork = "Amex",
            BaseSpendAmount = 1m,
            SpendBonusCategory = Array.Empty<RapidApiSpendBonusCategory>()
        };

        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.ListAllCardsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(allCards);
        provider.Setup(p => p.GetCardDetailAsync("amex-gold", It.IsAny<CancellationToken>())).ReturnsAsync(detail);

        var catalog = new Mock<ICatalogSyncService>();
        catalog.Setup(c => c.UpsertIssuerByNameAsync(It.IsAny<string>(), now, It.IsAny<CancellationToken>())).ReturnsAsync((short)3);
        catalog.Setup(c => c.UpsertCardProductAsync(It.IsAny<RewardsCcCardProductData>(), (short)3, now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CardProductUpsertResult(7, Created: true));
        catalog.Setup(c => c.ReplaceRewardRulesForCardAsync(7, It.IsAny<IReadOnlyList<RewardsCcRewardRuleData>>(), It.IsAny<IReadOnlyDictionary<string, short>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogUpsertCounts(0, 0));

        var business = new RewardsCcCatalogSyncBusiness(provider.Object, catalog.Object, NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncSeededCardsAsync(Array.Empty<RewardsCcSeedEntry>(), now, CancellationToken.None);

        Assert.Equal(1, result.Processed);
        Assert.Equal(1, result.Created);
        provider.Verify(p => p.SearchCardByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SyncSeededCards_creates_card_on_success()
    {
        var now = DateTimeOffset.UtcNow;
        var seed = new[] { new RewardsCcSeedEntry { Issuer = "Chase", Cards = { "Sapphire Preferred" } } };
        var search = new[] { new RapidApiSearchResult { CardKey = "chase-sapphire-preferred", CardIssuer = "Chase", CardName = "Sapphire Preferred" } };
        var detail = new RapidApiCardDetail
        {
            CardKey = "chase-sapphire-preferred",
            CardIssuer = "Chase",
            CardName = "Sapphire Preferred",
            CardNetwork = "Visa",
            BaseSpendAmount = 1m,
            SpendBonusCategory = new[]
            {
                new RapidApiSpendBonusCategory
                {
                    SpendBonusCategoryId = 1001,
                    SpendBonusCategoryName = "Dining",
                    SpendBonusCategoryGroup = "Dining",
                    SpendBonusSubcategoryGroup = "All Dining",
                    EarnMultiplier = 3m
                }
            }
        };

        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.SearchCardByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(search);
        provider.Setup(p => p.GetCardDetailAsync("chase-sapphire-preferred", It.IsAny<CancellationToken>())).ReturnsAsync(detail);

        var catalog = new Mock<ICatalogSyncService>();
        catalog.Setup(c => c.UpsertIssuerByNameAsync("Chase", now, It.IsAny<CancellationToken>())).ReturnsAsync((short)5);
        catalog.Setup(c => c.UpsertCategoryAsync(It.IsAny<RewardsCcCategoryData>(), now, It.IsAny<CancellationToken>())).ReturnsAsync((short)9);
        catalog.Setup(c => c.UpsertCardProductAsync(It.IsAny<RewardsCcCardProductData>(), (short)5, now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CardProductUpsertResult(42, Created: true));
        catalog.Setup(c => c.ReplaceRewardRulesForCardAsync(42, It.IsAny<IReadOnlyList<RewardsCcRewardRuleData>>(), It.IsAny<IReadOnlyDictionary<string, short>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogUpsertCounts(1, 0));

        var business = new RewardsCcCatalogSyncBusiness(provider.Object, catalog.Object, NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncSeededCardsAsync(seed, now, CancellationToken.None);

        Assert.Equal(1, result.Processed);
        Assert.Equal(1, result.Created);
        Assert.Equal(0, result.Failed);
    }

    [Fact]
    public async Task SyncSeededCards_records_failure_on_no_search_match()
    {
        var seed = new[] { new RewardsCcSeedEntry { Issuer = "Unknown", Cards = { "Ghost Card" } } };
        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.SearchCardByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RapidApiSearchResult>());
        var business = new RewardsCcCatalogSyncBusiness(provider.Object, Mock.Of<ICatalogSyncService>(), NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncSeededCardsAsync(seed, DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(1, result.Processed);
        Assert.Equal(1, result.Failed);
        Assert.Equal(0, result.Created);
    }

    [Fact]
    public async Task SyncSeededCards_continues_when_one_card_throws()
    {
        var now = DateTimeOffset.UtcNow;
        var seed = new[]
        {
            new RewardsCcSeedEntry { Issuer = "Chase", Cards = { "Broken", "Sapphire Preferred" } }
        };
        var goodDetail = new RapidApiCardDetail
        {
            CardKey = "good",
            CardIssuer = "Chase",
            CardName = "Sapphire Preferred",
            CardNetwork = "Visa",
            BaseSpendAmount = 1m,
            SpendBonusCategory = Array.Empty<RapidApiSpendBonusCategory>()
        };
        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.SearchCardByNameAsync(It.Is<string>(q => q.Contains("Broken")), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("rewardsCc", "boom"));
        provider.Setup(p => p.SearchCardByNameAsync(It.Is<string>(q => q.Contains("Sapphire")), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new RapidApiSearchResult { CardKey = "good", CardIssuer = "Chase", CardName = "Sapphire Preferred" } });
        provider.Setup(p => p.GetCardDetailAsync("good", It.IsAny<CancellationToken>())).ReturnsAsync(goodDetail);

        var catalog = new Mock<ICatalogSyncService>();
        catalog.Setup(c => c.UpsertIssuerByNameAsync(It.IsAny<string>(), now, It.IsAny<CancellationToken>())).ReturnsAsync((short)5);
        catalog.Setup(c => c.UpsertCardProductAsync(It.IsAny<RewardsCcCardProductData>(), (short)5, now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CardProductUpsertResult(99, Created: true));
        catalog.Setup(c => c.ReplaceRewardRulesForCardAsync(99, It.IsAny<IReadOnlyList<RewardsCcRewardRuleData>>(), It.IsAny<IReadOnlyDictionary<string, short>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogUpsertCounts(0, 0));

        var business = new RewardsCcCatalogSyncBusiness(provider.Object, catalog.Object, NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncSeededCardsAsync(seed, now, CancellationToken.None);

        Assert.Equal(2, result.Processed);
        Assert.Equal(1, result.Created);
        Assert.Equal(1, result.Failed);
    }
}
