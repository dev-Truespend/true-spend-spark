namespace TrueSpend.Domain.Models.Transactions;

public sealed record TransactionCategoriesResponse(IReadOnlyList<TransactionCategory> Categories);
