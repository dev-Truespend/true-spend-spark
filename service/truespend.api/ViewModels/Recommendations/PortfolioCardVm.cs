using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record PortfolioCardVm(
    CardSummaryVm Card,
    IReadOnlyList<PortfolioCategoryVm> TopCategories);
