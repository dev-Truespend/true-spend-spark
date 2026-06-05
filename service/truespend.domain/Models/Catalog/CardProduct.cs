namespace TrueSpend.Domain.Models.Catalog;

public sealed record CardProduct(int Id, string IssuerName, string DisplayName, string? CardArtUrl, decimal? AnnualFee, string? RewardCurrencyName);
