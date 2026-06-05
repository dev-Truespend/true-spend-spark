using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;

namespace TrueSpend.Domain.Services.Recommendations;

public sealed class RecommendationsReadService(TrueSpendDbContext db) : IRecommendationsReadService
{
    public async Task<Recommendation?> GetRecommendationAsync(int recommendationId, CancellationToken cancellationToken)
    {
        var recommendation = await db.Recommendations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == recommendationId, cancellationToken);
        if (recommendation is null) return null;

        var merchant = recommendation.MerchantId is int merchantId
            ? await db.Merchants.AsNoTracking().FirstOrDefaultAsync(x => x.Id == merchantId, cancellationToken)
            : null;
        var category = recommendation.CategoryId is short categoryId
            ? await db.Categories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == categoryId, cancellationToken)
            : null;

        return new Recommendation(
            recommendation.Id,
            new Merchant(merchant?.Id ?? 0, merchant?.CanonicalName ?? "Unknown", category?.Code ?? "general", merchant?.IsMultiCategory ?? false, merchant?.Address),
            category?.Code ?? "general",
            new RecommendationCard(
                new Models.Cards.CardSummary(recommendation.RecommendedUserCardId, "Recommended card", "Issuer", null, "manual", false, "active", null),
                recommendation.ExpectedRewardRate ?? 0,
                new Models.Common.Money(recommendation.ExpectedRewardAmount ?? 0, "USD", $"${recommendation.ExpectedRewardAmount ?? 0:0.00}"),
                "Highest expected reward",
                1),
            "Recommended based on user history",
            [],
            null);
    }
}
