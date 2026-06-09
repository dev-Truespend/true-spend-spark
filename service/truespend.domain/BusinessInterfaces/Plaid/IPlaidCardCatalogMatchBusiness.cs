namespace TrueSpend.Domain.BusinessInterfaces.Plaid;

public sealed record PlaidCardCatalogMatchSummary(int Matched, int Skipped);

public interface IPlaidCardCatalogMatchBusiness
{
    Task<int?> MatchOneAsync(string institutionName, string accountName, CancellationToken cancellationToken);

    Task<PlaidCardCatalogMatchSummary> MatchAllOrphansAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
