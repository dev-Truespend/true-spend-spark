namespace TrueSpend.Api.ViewModels.Transactions;

public sealed class CreateTransactionRequestVm
{
    public string MerchantName { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public int CardId { get; init; }
    public string CategoryCode { get; init; } = string.Empty;
    public string TransactionDate { get; init; } = string.Empty;
    public string? TransactionTime { get; init; }
    public string? LocationLabel { get; init; }
    public decimal? LocationLat { get; init; }
    public decimal? LocationLng { get; init; }
}
