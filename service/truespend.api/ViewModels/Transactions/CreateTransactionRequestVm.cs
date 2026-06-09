namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class CreateTransactionRequestVm
{
    #region archive — manual transaction add (removed from MVP)
    // Manual transaction creation was removed from the MVP API surface. The class is kept as an
    // empty type so any compile-time references in archived controller/mapper blocks resolve.
    //
    // public string MerchantName { get; init; } = string.Empty;
    // public decimal Amount { get; init; }
    // public int CardId { get; init; }
    // public string CategoryCode { get; init; } = string.Empty;
    // public string TransactionDate { get; init; } = string.Empty;
    // public string? TransactionTime { get; init; }
    // public string? LocationLabel { get; init; }
    // public decimal? LocationLat { get; init; }
    // public decimal? LocationLng { get; init; }
    #endregion
}
