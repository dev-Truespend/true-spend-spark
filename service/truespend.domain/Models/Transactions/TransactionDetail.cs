namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionDetail(
    int Id,
    string MerchantName,
    decimal Amount,
    string CurrencyCode,
    int CardId,
    string CardDisplayName,
    string? CategoryCode,
    string? CategoryName,
    DateOnly TransactionDate,
    TimeOnly? TransactionTime,
    string? LocationLabel,
    decimal? LocationLat,
    decimal? LocationLng,
    string Source,
    bool IsPending);
