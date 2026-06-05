namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionListQuery(string? Q, string? CategoryCode, int? CardId);
