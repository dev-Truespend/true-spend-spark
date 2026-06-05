namespace TrueSpend.Domain.Models.Cards;

public sealed record CardTerms(
    decimal? AnnualFee,
    string? PurchaseApr,
    string? ForeignTransactionFee,
    string? TermsSummary);
