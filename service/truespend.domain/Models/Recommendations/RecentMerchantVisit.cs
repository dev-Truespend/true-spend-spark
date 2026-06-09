namespace TrueSpend.Domain.Models.Recommendations;

public sealed record RecentMerchantVisit(Merchant Merchant, string CategoryCode, DateTimeOffset VisitedAt);
