namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record PlaidTransactionSyncResponseVm(
    int ConnectionId,
    int ImportedCount,
    int UpdatedCount,
    int RemovedCount,
    DateTimeOffset? LastTransactionSyncAt);
