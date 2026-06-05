namespace TrueSpend.Domain.Models.Recommendations;

public sealed record HomeEmptyState(string Title, string Body, string PrimaryActionCode, string SecondaryActionCode, string? UpgradeMessage);
