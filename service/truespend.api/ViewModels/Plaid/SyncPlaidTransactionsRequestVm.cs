namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record SyncPlaidTransactionsRequestVm(int? ConnectionId, bool Force = false);
