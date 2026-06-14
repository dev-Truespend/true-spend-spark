using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Entities.Foursquare;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

// Confidence-gated nearest-merchant resolution. Treats the device coordinate as an approximate area:
// search radius -> rank by distance -> act on the tier. Never "nearest POI wins".
public sealed class GeoPlaceMatchBusinessTests
{
    private const decimal OriginLat = 37.7929m;
    private const decimal OriginLng = -122.3971m;

    [Fact]
    public async Task High_confidence_when_single_clear_candidate()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Chipotle", 10) });
        var business = ctx.Build();

        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 120, "on_foot", CancellationToken.None);

        Assert.True(match.HasCandidate);
        Assert.Equal("Chipotle", match.Name);
        Assert.Equal(ArrivalConfidenceTierEnum.High, match.Tier);
    }

    [Fact]
    public async Task Medium_confidence_when_two_close_candidates()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Chipotle", 10), Candidate("fsq-2", "Starbucks", 40) });
        var business = ctx.Build();

        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 120, "on_foot", CancellationToken.None);

        Assert.True(match.HasCandidate);
        Assert.Equal(ArrivalConfidenceTierEnum.Medium, match.Tier);
    }

    [Fact]
    public async Task Miss_calls_provider_persists_then_matches()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.SetupSequence(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FoursquarePlaceCandidate>())
            .ReturnsAsync(new[] { Candidate("fsq-new", "Target", 8) });
        ctx.Provider.Setup(p => p.NearbySearchAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { ProviderPlace("fsq-new", "Target") });
        var business = ctx.Build();

        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 120, "on_foot", CancellationToken.None);

        Assert.True(match.HasCandidate);
        Assert.Equal("Target", match.Name);
        ctx.WriteService.Verify(w => w.UpsertPlaceAsync(It.IsAny<ProviderPlace>(), It.IsAny<int?>(), It.IsAny<short?>(), "on_demand_lookup", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Coarse_accuracy_caps_at_low()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Chipotle", 10) });
        var business = ctx.Build();

        var match = await business.ResolveAsync(OriginLat, OriginLng, 120m, 120, "on_foot", CancellationToken.None);

        Assert.Equal(ArrivalConfidenceTierEnum.Low, match.Tier);
    }

    [Fact]
    public async Task None_when_no_candidate_even_after_provider()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<FoursquarePlaceCandidate>());
        ctx.Provider.Setup(p => p.NearbySearchAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<ProviderPlace>());
        var business = ctx.Build();

        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 120, "on_foot", CancellationToken.None);

        Assert.False(match.HasCandidate);
        Assert.Equal(ArrivalConfidenceTierEnum.None, match.Tier);
    }

    [Fact]
    public async Task Short_in_vehicle_stop_demotes_high_to_medium()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Target", 10) });
        var business = ctx.Build();

        // Clear single candidate would be High, but a sub-minute in-vehicle stop reads as a drive-by.
        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 20, "in_vehicle", CancellationToken.None);

        Assert.Equal(ArrivalConfidenceTierEnum.Medium, match.Tier);
    }

    [Fact]
    public async Task Drive_up_category_keeps_high_for_short_in_vehicle_stop()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Shell", 10, GeoConstants.GasStationsCategoryCode) });
        var business = ctx.Build();

        // Same short in-vehicle stop, but a gas station is built for it — stays High so the push fires.
        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 20, "in_vehicle", CancellationToken.None);

        Assert.Equal(ArrivalConfidenceTierEnum.High, match.Tier);
    }

    [Fact]
    public async Task Sustained_stationary_tight_stop_promotes_medium_to_high()
    {
        var ctx = TestContext.Default();
        // Two close candidates => margin under the 60m gap, so the fast path is only Medium.
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Walmart", 10), Candidate("fsq-2", "Sam's Club", 40) });
        var business = ctx.Build();

        // A sustained (>=150s), stationary, tight-fix (<=40m) stop is itself a confident visit => High.
        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 200, "on_foot", CancellationToken.None);

        Assert.Equal(ArrivalConfidenceTierEnum.High, match.Tier);
    }

    [Fact]
    public async Task Sustained_stop_with_loose_fix_stays_medium()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Walmart", 10), Candidate("fsq-2", "Sam's Club", 40) });
        var business = ctx.Build();

        // Long dwell but the fix is too loose (>40m, still under the 75m coarse cap) to promote on dwell.
        var match = await business.ResolveAsync(OriginLat, OriginLng, 55m, 200, "on_foot", CancellationToken.None);

        Assert.Equal(ArrivalConfidenceTierEnum.Medium, match.Tier);
    }

    [Fact]
    public async Task Sustained_in_vehicle_stop_is_not_promoted()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Walmart", 10), Candidate("fsq-2", "Sam's Club", 40) });
        var business = ctx.Build();

        // Long, tight stop but still in-vehicle (e.g. parked at a light) — dwell promotion excludes it.
        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 200, "in_vehicle", CancellationToken.None);

        Assert.Equal(ArrivalConfidenceTierEnum.Medium, match.Tier);
    }

    [Fact]
    public async Task Far_lone_candidate_is_not_high_confidence()
    {
        var ctx = TestContext.Default();
        // The only (so "clearest") place in range, but ~90m away — closest-within-radius, not AT it.
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Chipotle", 90) });
        var business = ctx.Build();

        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 120, "on_foot", CancellationToken.None);

        Assert.True(match.HasCandidate);
        Assert.NotEqual(ArrivalConfidenceTierEnum.High, match.Tier);
    }

    [Fact]
    public async Task Far_match_is_not_promoted_even_after_long_dwell()
    {
        var ctx = TestContext.Default();
        ctx.ReadService.Setup(r => r.FindActiveCandidatesAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { Candidate("fsq-1", "Chipotle", 90) });
        var business = ctx.Build();

        // Long, tight, stationary dwell — but 90m from the place (e.g. sitting at home near a Chipotle).
        // The proximity gate must still keep it out of High so no lock-screen push fires.
        var match = await business.ResolveAsync(OriginLat, OriginLng, 12m, 600, "on_foot", CancellationToken.None);

        Assert.NotEqual(ArrivalConfidenceTierEnum.High, match.Tier);
    }

    // metersNorth is offset along latitude so Haversine distance ~= metersNorth.
    private static FoursquarePlaceCandidate Candidate(string id, string name, double metersNorth, string? categoryCode = null) =>
        new(1, "foursquare", id, name, name, null, categoryCode,
            OriginLat + (decimal)(metersNorth / 111_320.0), OriginLng, 0d);

    private static ProviderPlace ProviderPlace(string id, string name) =>
        new("foursquare", id, name, null, name, "63be6904847c3692a84b9bb5", "Dining and Drinking",
            OriginLat, OriginLng, null, null, null, null, "US");

    private sealed class TestContext
    {
        public Mock<IGeoPlaceMatchReadService> ReadService { get; } = new();
        public Mock<IFoursquareCatalogReadService> CatalogRead { get; } = new();
        public Mock<IFoursquarePlacesProvider> Provider { get; } = new();
        public Mock<IFoursquarePlacesWriteService> WriteService { get; } = new();

        public static TestContext Default()
        {
            var ctx = new TestContext();
            ctx.CatalogRead.Setup(c => c.GetActiveCategoryBridgeAsync(It.IsAny<CancellationToken>()))
                .ReturnsAsync(Array.Empty<FoursquareCategoryBridgeEntity>());
            ctx.WriteService.Setup(w => w.UpsertChainAsync(It.IsAny<string?>(), It.IsAny<string>(), It.IsAny<short?>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((1, true));
            ctx.WriteService.Setup(w => w.UpsertPlaceAsync(It.IsAny<ProviderPlace>(), It.IsAny<int?>(), It.IsAny<short?>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync((1, true));
            return ctx;
        }

        public GeoPlaceMatchBusiness Build() => new(
            ReadService.Object,
            CatalogRead.Object,
            Provider.Object,
            WriteService.Object,
            NullLogger<GeoPlaceMatchBusiness>.Instance);
    }
}
