using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidInstitutionsCatalogBusiness(
    IPlaidProvider provider,
    IPlaidInstitutionsCatalogService catalogService,
    ILogger<PlaidInstitutionsCatalogBusiness> logger) : IPlaidInstitutionsCatalogBusiness
{
    private static readonly IReadOnlyCollection<string> DefaultCountries = new[] { "US" };
    private static readonly IReadOnlyCollection<string> DefaultProducts = new[] { "transactions" };
    private const int PageSize = 500;

    public async Task<PlaidInstitutionSyncResult> SyncCatalogAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        IReadOnlyList<PlaidInstitutionData> institutions;
        try
        {
            institutions = await provider.GetInstitutionsAsync(DefaultCountries, DefaultProducts, PageSize, cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            logger.LogError(ex, "Plaid institutions sync failed during provider call");
            return PlaidInstitutionSyncResult.Empty with { Failed = 1 };
        }

        if (institutions.Count == 0) return PlaidInstitutionSyncResult.Empty;

        var upsert = await catalogService.UpsertInstitutionsAsync(institutions, now, cancellationToken);
        var seenIds = institutions.Select(i => i.PlaidInstitutionId).ToHashSet(StringComparer.Ordinal);
        var deactivated = await catalogService.DeactivateMissingInstitutionsAsync(seenIds, now, cancellationToken);

        return new PlaidInstitutionSyncResult(
            Processed: institutions.Count,
            Created: upsert.Created,
            Updated: upsert.Updated,
            Deactivated: deactivated,
            Failed: 0);
    }
}
