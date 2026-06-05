namespace TrueSpend.Domain.Models.Transactions;

public sealed record PlaidTransactionSyncResponse(
    int ConnectionId,
    int ImportedCount,
    int UpdatedCount,
    int RemovedCount,
    DateTimeOffset? LastTransactionSyncAt);
