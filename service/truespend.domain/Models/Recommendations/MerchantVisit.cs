namespace TrueSpend.Domain.Models.Recommendations;

public sealed record MerchantVisit(int MerchantId, string SelectedCategoryCode, DateTimeOffset VisitedAt);
