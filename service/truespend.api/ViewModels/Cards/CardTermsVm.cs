namespace TrueSpend.Api.ViewModels.Cards;

public sealed record CardTermsVm(decimal? AnnualFee, string? PurchaseApr, string? ForeignTransactionFee, string? TermsSummary);
