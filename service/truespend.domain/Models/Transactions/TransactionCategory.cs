namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionCategory(
    int Id,
    string Code,
    string DisplayName,
    string? Icon,
    short? DisplayOrder);
