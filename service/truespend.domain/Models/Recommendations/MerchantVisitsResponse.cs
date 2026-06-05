namespace TrueSpend.Domain.Models.Recommendations;

public sealed record MerchantVisitsResponse(IReadOnlyList<MerchantVisit> Visits);
