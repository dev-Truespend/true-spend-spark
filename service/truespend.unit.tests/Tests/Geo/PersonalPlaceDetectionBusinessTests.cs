using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Geo;

// Clusters recurring location fixes into dwell zones. A grid cell becomes a personal place only when it
// recurs across >= PersonalPlaceMinDistinctDays AND is not sitting on a known rewardable merchant; sparse
// one-off stops, short bursts, and favorite-store dwells are not suppressed.
public sealed class PersonalPlaceDetectionBusinessTests
{
    private static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
    private static readonly DateTimeOffset Now = new(2026, 6, 15, 12, 0, 0, TimeSpan.Zero);

    // Fixes all in one ~111m grid cell, each on a distinct day, starting `daysAgo` back.
    private static IEnumerable<LocationPoint> CellAcrossDays(decimal lat, decimal lng, int days, int startDaysAgo = 1)
    {
        for (var i = 0; i < days; i++)
        {
            // Jitter within the cell (< 0.001 deg) so the centroid is realistic but rounding stays in-cell.
            var jitter = (decimal)(i % 3) * 0.0001m;
            yield return new LocationPoint(lat + jitter, lng - jitter, Now.AddDays(-(startDaysAgo + i)));
        }
    }

    [Fact]
    public async Task Detects_and_upserts_a_recurring_dwell_cluster()
    {
        var service = new Mock<IPersonalPlaceService>();
        // Ten fixes in one cell across ten distinct days = a dwell zone; two lone fixes elsewhere are not.
        var points = CellAcrossDays(37.7929m, -122.3971m, 10)
            .Append(new LocationPoint(37.8500m, -122.2000m, Now.AddDays(-3)))
            .Append(new LocationPoint(37.8600m, -122.1000m, Now.AddDays(-4)))
            .ToList();
        service.Setup(s => s.GetRecentLocationPointsAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(points);
        service.Setup(s => s.HasNearbyRewardableMerchantAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        service.Setup(s => s.UpsertRecurringDwellAsync(UserId, It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var business = new PersonalPlaceDetectionBusiness(service.Object, NullLogger<PersonalPlaceDetectionBusiness>.Instance);

        var upserted = await business.DetectForUserAsync(UserId, Now, CancellationToken.None);

        Assert.Equal(1, upserted);
        service.Verify(s => s.UpsertRecurringDwellAsync(UserId, It.IsAny<decimal>(), It.IsAny<decimal>(), 10, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Excludes_dwell_sitting_on_a_known_rewardable_merchant()
    {
        // The cell recurs across enough days, but it's ON a rewardable place (favorite store/gym/coffee
        // shop) — exactly where we WANT to push a card, so it must not become a suppression zone.
        var service = new Mock<IPersonalPlaceService>();
        service.Setup(s => s.GetRecentLocationPointsAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(CellAcrossDays(37.7929m, -122.3971m, 12).ToList());
        service.Setup(s => s.HasNearbyRewardableMerchantAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<double>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var business = new PersonalPlaceDetectionBusiness(service.Object, NullLogger<PersonalPlaceDetectionBusiness>.Instance);

        var upserted = await business.DetectForUserAsync(UserId, Now, CancellationToken.None);

        Assert.Equal(0, upserted);
        service.Verify(s => s.UpsertRecurringDwellAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skips_cluster_that_recurs_across_too_few_days()
    {
        // Many fixes, but all crammed into two days (a one-off busy weekend) — not a home/work pattern.
        var service = new Mock<IPersonalPlaceService>();
        var burst = new List<LocationPoint>();
        for (var i = 0; i < 12; i++)
        {
            burst.Add(new LocationPoint(37.7929m, -122.3971m, Now.AddDays(-(i % 2 == 0 ? 1 : 2)).AddHours(i)));
        }
        service.Setup(s => s.GetRecentLocationPointsAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(burst);
        var business = new PersonalPlaceDetectionBusiness(service.Object, NullLogger<PersonalPlaceDetectionBusiness>.Instance);

        var upserted = await business.DetectForUserAsync(UserId, Now, CancellationToken.None);

        Assert.Equal(0, upserted);
        service.Verify(s => s.HasNearbyRewardableMerchantAsync(It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<double>(), It.IsAny<CancellationToken>()), Times.Never);
        service.Verify(s => s.UpsertRecurringDwellAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Skips_users_with_too_few_fixes()
    {
        var service = new Mock<IPersonalPlaceService>();
        service.Setup(s => s.GetRecentLocationPointsAsync(UserId, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<LocationPoint> { new(37.79m, -122.39m, Now.AddDays(-1)), new(37.80m, -122.40m, Now.AddDays(-2)) });
        var business = new PersonalPlaceDetectionBusiness(service.Object, NullLogger<PersonalPlaceDetectionBusiness>.Instance);

        var upserted = await business.DetectForUserAsync(UserId, Now, CancellationToken.None);

        Assert.Equal(0, upserted);
        service.Verify(s => s.UpsertRecurringDwellAsync(It.IsAny<Guid>(), It.IsAny<decimal>(), It.IsAny<decimal>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
