namespace TrueSpend.Api.ViewModels.Catalog;

public sealed record CardProductVm(
    int Id,
    string IssuerName,
    string DisplayName,
    string? CardArtUrl,
    decimal? AnnualFee,
    string? RewardCurrencyName);
