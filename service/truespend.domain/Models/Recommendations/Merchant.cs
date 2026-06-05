namespace TrueSpend.Domain.Models.Recommendations;

public sealed record Merchant(int Id, string Name, string CategoryCode, bool IsMultiCategory, string? Address);
