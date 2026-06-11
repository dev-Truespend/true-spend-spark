using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.Entities.Foursquare;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

public sealed class FoursquarePlacesCatalogSyncBusinessTests
{
    private const string DiningId = "63be6904847c3692a84b9bb5";

    [Fact]
    public async Task Upserts_places_and_chains_from_provider()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.GetActiveCategoryBridgeAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new FoursquareCategoryBridgeEntity { FoursquareCategoryId = DiningId, CategoryId = 3, IsActive = true } });
        ctx.Provider.Setup(p => p.SearchPlacesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProviderPlacesPage(new[] { Place("a", "Chipotle"), Place("b", "Starbucks") }, null));
        var business = ctx.Build();

        var result = await business.SyncPlacesAsync(CancellationToken.None);

        Assert.Equal(2, result.Processed);
        Assert.Equal(2, result.PlacesCreated);
        Assert.Equal(2, result.ChainsCreated);
    }

    [Fact]
    public async Task No_active_bridge_rows_skips_fetch()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.GetActiveCategoryBridgeAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FoursquareCategoryBridgeEntity>());
        var business = ctx.Build();

        var result = await business.SyncPlacesAsync(CancellationToken.None);

        Assert.Equal(0, result.Processed);
        ctx.Provider.Verify(p => p.SearchPlacesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Provider_failure_propagates()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.GetActiveCategoryBridgeAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new FoursquareCategoryBridgeEntity { FoursquareCategoryId = DiningId, CategoryId = 3, IsActive = true } });
        ctx.Provider.Setup(p => p.SearchPlacesAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("provider down"));
        var business = ctx.Build();

        await Assert.ThrowsAsync<InvalidOperationException>(() => business.SyncPlacesAsync(CancellationToken.None));
    }

    private static ProviderPlace Place(string id, string name) =>
        new("foursquare", id, name, $"chain-{id}", name, DiningId, "Dining and Drinking",
            37.79m, -122.39m, null, null, null, null, "US");

    private sealed class TestContext
    {
        public Mock<IFoursquareCatalogReadService> ReadService { get; } = new();
        public Mock<IFoursquarePlacesProvider> Provider { get; } = new();
        public Mock<IFoursquarePlacesWriteService> WriteService { get; } = new();

        public static TestContext Default()
        {
            var ctx = new TestContext();
            ctx.WriteService.Setup(w => w.UpsertChainAsync(It.IsAny<string?>(), It.IsAny<string>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((1, true));
            ctx.WriteService.Setup(w => w.UpsertPlaceAsync(It.IsAny<ProviderPlace>(), It.IsAny<int?>(), It.IsAny<short?>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((1, true));
            return ctx;
        }

        public FoursquarePlacesCatalogSyncBusiness Build() => new(
            ReadService.Object,
            Provider.Object,
            WriteService.Object,
            Options.Create(new FoursquarePlacesCatalogOptions { Mode = "api", Regions = ["US"], BatchSize = 50 }),
            NullLogger<FoursquarePlacesCatalogSyncBusiness>.Instance);
    }
}
