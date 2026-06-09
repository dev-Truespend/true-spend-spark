namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class UpdateTransactionRequestVm
{
    #region archive — manual transaction edit (removed from MVP)
    // Manual transaction edit was removed from the MVP API surface. The class is kept as an empty
    // type so any compile-time references in archived controller/mapper blocks resolve.
    //
    // public string? MerchantName { get; init; }
    // public decimal? Amount { get; init; }
    // public int? CardId { get; init; }
    // public string? CategoryCode { get; init; }
    // public string? TransactionDate { get; init; }
    // public string? TransactionTime { get; init; }
    // public string? LocationLabel { get; init; }
    // public decimal? LocationLat { get; init; }
    // public decimal? LocationLng { get; init; }
    #endregion
}
