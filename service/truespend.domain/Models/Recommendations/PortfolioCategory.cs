namespace TrueSpend.Domain.Models.Recommendations;

public sealed record PortfolioCategory(
    string CategoryCode,
    string CategoryName,
    decimal Multiplier);
