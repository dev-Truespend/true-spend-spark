using TrueSpend.Domain.BusinessInterfaces.Plaid;

namespace TrueSpend.WorkerService.Jobs;

public sealed class PlaidInstitutionCatalogJob(IPlaidInstitutionsCatalogBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.SyncCatalogAsync(DateTimeOffset.UtcNow, cancellationToken);
}
