using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.BusinessInterfaces.Geo;

// Supplies the capped set of native-geofence regions for a device to monitor (item 8) — the user's
// most-frequented places, so the OS can wake the app on enter/exit cheaply instead of continuous tracking.
public interface IGeoMonitoredRegionsBusiness
{
    Task<BusinessResponse<IReadOnlyList<MonitoredRegion>>> GetRegionsAsync(Guid userId, CancellationToken cancellationToken);
}
