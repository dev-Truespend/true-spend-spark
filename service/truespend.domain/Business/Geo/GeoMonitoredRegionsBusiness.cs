using System.Globalization;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Business.Geo;

// Derives the device's native-geofence region set (item 8) from the user's recent location history:
// cluster fixes on a coarse grid, take the most-frequented cells, cap under the iOS 20-region limit.
// Reuses the same point read + grid as personal-place detection.
public sealed class GeoMonitoredRegionsBusiness(IPersonalPlaceService personalPlaceService) : IGeoMonitoredRegionsBusiness
{
    public async Task<BusinessResponse<IReadOnlyList<MonitoredRegion>>> GetRegionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-GeoConstants.MonitoredRegionLookbackDays);
        var points = await personalPlaceService.GetRecentLocationPointsAsync(userId, since, cancellationToken);

        var regions = points
            .GroupBy(p => (
                Lat: Math.Round((double)p.Lat, GeoConstants.PersonalPlaceGridDecimals),
                Lng: Math.Round((double)p.Lng, GeoConstants.PersonalPlaceGridDecimals)))
            .Select(g => new
            {
                Count = g.Count(),
                CenterLat = g.Average(p => (double)p.Lat),
                CenterLng = g.Average(p => (double)p.Lng)
            })
            .OrderByDescending(c => c.Count)
            .Take(GeoConstants.MonitoredRegionMaxCount)
            .Select(c => new MonitoredRegion(
                Identifier: $"region:{c.CenterLat.ToString("F4", CultureInfo.InvariantCulture)},{c.CenterLng.ToString("F4", CultureInfo.InvariantCulture)}",
                Lat: (decimal)c.CenterLat,
                Lng: (decimal)c.CenterLng,
                RadiusMeters: GeoConstants.MonitoredRegionRadiusMeters))
            .ToList();

        return BusinessResponse<IReadOnlyList<MonitoredRegion>>.Ok(regions);
    }
}
