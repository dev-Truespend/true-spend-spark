namespace TrueSpend.Domain.Models.Recommendations;

public sealed record CreateMerchantVisitRequest(int MerchantId, string SelectedCategoryCode, DateTimeOffset VisitedAt);
