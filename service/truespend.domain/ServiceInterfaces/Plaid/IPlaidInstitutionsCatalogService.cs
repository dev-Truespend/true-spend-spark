using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public sealed record InstitutionUpsertCounts(int Created, int Updated);

public interface IPlaidInstitutionsCatalogService
{
    Task<InstitutionUpsertCounts> UpsertInstitutionsAsync(
        IReadOnlyList<PlaidInstitutionData> institutions,
        DateTimeOffset now,
        CancellationToken cancellationToken);

    Task<int> DeactivateMissingInstitutionsAsync(
        IReadOnlyCollection<string> seenPlaidInstitutionIds,
        DateTimeOffset now,
        CancellationToken cancellationToken);
}
