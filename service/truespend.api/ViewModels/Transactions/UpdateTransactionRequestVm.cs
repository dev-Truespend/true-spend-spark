namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class UpdateTransactionRequestVm
{
    public string? MerchantName { get; init; }
    public decimal? Amount { get; init; }
    public int? CardId { get; init; }
    public string? CategoryCode { get; init; }
    public string? TransactionDate { get; init; }
    public string? TransactionTime { get; init; }
    public string? LocationLabel { get; init; }
    public decimal? LocationLat { get; init; }
    public decimal? LocationLng { get; init; }
}
