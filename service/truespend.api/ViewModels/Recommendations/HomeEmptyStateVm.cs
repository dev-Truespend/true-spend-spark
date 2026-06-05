namespace TrueSpend.Api.ViewModels.Recommendations;

public sealed record HomeEmptyStateVm(
    string Title,
    string Body,
    string PrimaryActionCode,
    string SecondaryActionCode,
    string? UpgradeMessage);
