using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.BusinessInterfaces.Plaid;

public interface IPlaidInstitutionsCatalogBusiness
{
    Task<PlaidInstitutionSyncResult> SyncCatalogAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
