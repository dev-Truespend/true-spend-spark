namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class TransactionsResponseVm
{
    public IReadOnlyList<TransactionVm> Transactions { get; init; } = [];
    public bool EmptyState { get; init; }
}
