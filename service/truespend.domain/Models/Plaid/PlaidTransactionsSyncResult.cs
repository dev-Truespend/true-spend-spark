namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidTransactionsSyncResult(
    IReadOnlyList<PlaidTransactionData> Added,
    IReadOnlyList<PlaidTransactionData> Modified,
    IReadOnlyList<string> RemovedPlaidTransactionIds,
    string? NewCursor,
    DateTimeOffset SyncAt);
