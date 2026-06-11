using TrueSpend.Domain.BusinessInterfaces.Geo;

namespace TrueSpend.WorkerService.Jobs;

public sealed class FoursquarePlacesCatalogSyncJob(IFoursquarePlacesCatalogSyncBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.SyncPlacesAsync(cancellationToken);
}
