namespace TrueSpend.Domain.Models.Transactions;

public sealed record SyncPlaidTransactionsRequest(int? ConnectionId, bool Force);
