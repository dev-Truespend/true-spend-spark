namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidInstitutionSyncResult(
    int Processed,
    int Created,
    int Updated,
    int Deactivated,
    int Failed)
{
    public static PlaidInstitutionSyncResult Empty => new(0, 0, 0, 0, 0);
}
