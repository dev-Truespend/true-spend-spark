namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record PortfolioCategoryVm(
    string CategoryCode,
    string CategoryName,
    decimal Multiplier);
