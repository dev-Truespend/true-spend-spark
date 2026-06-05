namespace TrueSpend.Domain.Models.Transactions;

public sealed record CreateTransactionRequest(
    string MerchantName,
    decimal Amount,
    int CardId,
    string CategoryCode,
    DateOnly TransactionDate,
    TimeOnly? TransactionTime,
    string? LocationLabel,
    decimal? LocationLat,
    decimal? LocationLng);
