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
    public async Task SyncIssuers_upserts_and_deactivates_missing()
    {
        var now = DateTimeOffset.UtcNow;
        var issuers = new List<RewardsCcIssuerData>
        {
            new("rcc-issuer-chase", "Chase", null),
            new("rcc-issuer-amex", "American Express", null),
        };
        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.GetIssuersAsync(It.IsAny<CancellationToken>())).ReturnsAsync(issuers);
        var catalog = new Mock<ICatalogSyncService>();
        catalog.Setup(c => c.UpsertIssuersAsync(issuers, now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogUpsertCounts(1, 1));
        catalog.Setup(c => c.DeactivateMissingIssuersAsync(
                It.Is<IReadOnlyCollection<string>>(s => s.Count == 2),
                now,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        var business = new RewardsCcCatalogSyncBusiness(provider.Object, catalog.Object, NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncIssuersAsync(now, CancellationToken.None);

        Assert.Equal(2, result.Processed);
        Assert.Equal(1, result.Created);
        Assert.Equal(3, result.Deactivated);
        Assert.Equal(0, result.Failed);
    }

    [Fact]
    public async Task SyncCardProducts_returns_empty_on_no_products()
    {
        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.GetCardProductsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<RewardsCcCardProductData>());
        var business = new RewardsCcCatalogSyncBusiness(provider.Object, Mock.Of<ICatalogSyncService>(), NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncCardProductsAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(0, result.Processed);
        Assert.Equal(0, result.Failed);
    }

    [Fact]
    public async Task SyncRewardRules_iterates_each_card_and_aggregates_counts()
    {
        var now = DateTimeOffset.UtcNow;
        var lookups = new List<CardProductIdLookup>
        {
            new(101, "rcc-card-chase-freedom-flex"),
            new(102, "rcc-card-amex-blue-cash-preferred"),
        };
        var provider = new Mock<IRewardsCcProvider>();
        var catalog = new Mock<ICatalogSyncService>();
        catalog.Setup(c => c.GetCardProductIdLookupsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(lookups);
        provider.Setup(p => p.GetRewardRulesAsync("rcc-card-chase-freedom-flex", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new RewardsCcRewardRuleData("rcc-card-chase-freedom-flex", "grocery", 5m, 1500m, "quarterly", null, null, true, null),
                new RewardsCcRewardRuleData("rcc-card-chase-freedom-flex", null, 1m, null, null, null, null, false, null),
            });
        provider.Setup(p => p.GetRewardRulesAsync("rcc-card-amex-blue-cash-preferred", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new RewardsCcRewardRuleData("rcc-card-amex-blue-cash-preferred", "grocery", 6m, 6000m, "yearly", null, null, false, null),
            });
        catalog.Setup(c => c.UpsertRewardRulesForCardAsync(It.IsAny<int>(), It.IsAny<IReadOnlyList<RewardsCcRewardRuleData>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogUpsertCounts(2, 1));
        catalog.Setup(c => c.ExpireMissingRewardRulesAsync(It.IsAny<int>(), It.IsAny<IReadOnlyCollection<(short?, decimal)>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);
        catalog.Setup(c => c.GetCategoryIdByCodeAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((short?)null);
        var business = new RewardsCcCatalogSyncBusiness(provider.Object, catalog.Object, NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncRewardRulesAsync(now, CancellationToken.None);

        Assert.Equal(3, result.Processed);
        Assert.Equal(4, result.Created);
        Assert.Equal(2, result.Updated);
        Assert.Equal(2, result.Deactivated);
    }

    [Fact]
    public async Task SyncIssuers_records_failure_when_provider_throws_external_provider_exception()
    {
        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.GetIssuersAsync(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("rewardsCc", "boom"));
        var business = new RewardsCcCatalogSyncBusiness(provider.Object, Mock.Of<ICatalogSyncService>(), NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncIssuersAsync(DateTimeOffset.UtcNow, CancellationToken.None);

        Assert.Equal(1, result.Failed);
    }

    [Fact]
    public async Task SyncRewardRules_skips_failed_card_but_continues_for_others()
    {
        var now = DateTimeOffset.UtcNow;
        var lookups = new List<CardProductIdLookup>
        {
            new(101, "broken-card"),
            new(102, "rcc-card-citi-double-cash"),
        };
        var provider = new Mock<IRewardsCcProvider>();
        provider.Setup(p => p.GetRewardRulesAsync("broken-card", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("rewardsCc", "boom"));
        provider.Setup(p => p.GetRewardRulesAsync("rcc-card-citi-double-cash", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[]
            {
                new RewardsCcRewardRuleData("rcc-card-citi-double-cash", null, 2m, null, null, null, null, false, null),
            });
        var catalog = new Mock<ICatalogSyncService>();
        catalog.Setup(c => c.GetCardProductIdLookupsAsync(It.IsAny<CancellationToken>())).ReturnsAsync(lookups);
        catalog.Setup(c => c.UpsertRewardRulesForCardAsync(102, It.IsAny<IReadOnlyList<RewardsCcRewardRuleData>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CatalogUpsertCounts(1, 0));
        catalog.Setup(c => c.ExpireMissingRewardRulesAsync(102, It.IsAny<IReadOnlyCollection<(short?, decimal)>>(), now, It.IsAny<CancellationToken>()))
            .ReturnsAsync(0);
        catalog.Setup(c => c.GetCategoryIdByCodeAsync(It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((short?)null);
        var business = new RewardsCcCatalogSyncBusiness(provider.Object, catalog.Object, NullLogger<RewardsCcCatalogSyncBusiness>.Instance);

        var result = await business.SyncRewardRulesAsync(now, CancellationToken.None);

        Assert.Equal(1, result.Failed);
        Assert.Equal(1, result.Created);
    }
}
