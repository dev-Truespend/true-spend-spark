using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

// Builds the native-geofence region set from clustered location history, ranked by frequency.
public sealed class GeoMonitoredRegionsBusinessTests
{
    private static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    [Fact]
    public async Task Returns_frequent_clusters_ranked_by_visit_count()
    {
        var service = new Mock<IPersonalPlaceService>();
        // Cluster A (3 fixes) is more frequent than cluster B (1 fix).
        // OccurredAt is irrelevant to monitored-region ranking (frequency only), so it's left default.
        var points = new List<LocationPoint>
        {
            new(37.7929m, -122.3971m, default),
            new(37.7930m, -122.3972m, default),
            new(37.7928m, -122.3970m, default),
            new(40.7128m, -74.0060m, default)
        };
        service.Setup(s => s.GetRecentLocationPointsAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(points);
        var business = new GeoMonitoredRegionsBusiness(service.Object);

        var response = await business.GetRegionsAsync(UserId, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(2, response.Data!.Count);
        // Most-frequented cluster (A, ~37.79) ranks first.
        Assert.True(response.Data[0].Lat is > 37.5m and < 38m);
        Assert.All(response.Data, r => Assert.False(string.IsNullOrWhiteSpace(r.Identifier)));
    }

    [Fact]
    public async Task Returns_empty_when_no_location_history()
    {
        var service = new Mock<IPersonalPlaceService>();
        service.Setup(s => s.GetRecentLocationPointsAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<LocationPoint>());
        var business = new GeoMonitoredRegionsBusiness(service.Object);

        var response = await business.GetRegionsAsync(UserId, CancellationToken.None);

        Assert.True(response.Success);
        Assert.Empty(response.Data!);
    }
}
