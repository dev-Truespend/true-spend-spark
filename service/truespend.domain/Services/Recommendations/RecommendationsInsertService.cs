using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;

namespace TrueSpend.Domain.Services.Recommendations;

public sealed class RecommendationsInsertService(TrueSpendDbContext db) : IRecommendationsInsertService
{
    public Task<Recommendation> SaveRecommendationAsync(
        OnboardingWorkflowUser user,
        Recommendation recommendation,
        CancellationToken cancellationToken) =>
        SaveRecommendationAsync(user, recommendation, RecommendationsConstants.InStoreContextCode, cancellationToken);

    public async Task<Recommendation> SaveRecommendationAsync(
        OnboardingWorkflowUser user,
        Recommendation recommendation,
        string contextCode,
        CancellationToken cancellationToken)
    {
        var contextId = await db.RecommendationContexts.AsNoTracking()
            .Where(x => x.Code == contextCode)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (contextId == 0)
        {
            contextId = contextCode switch
            {
                RecommendationsConstants.GeofenceArrivalContextCode => (short)RecommendationContextEnum.GeofenceArrival,
                RecommendationsConstants.HomeContextCode => (short)RecommendationContextEnum.Home,
                _ => (short)RecommendationContextEnum.InStore
            };
        }

        var categoryId = await db.Categories.AsNoTracking()
            .Where(x => x.Code == recommendation.CategoryCode)
            .Select(x => (short?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var entity = new RecommendationEntity
        {
            UserId = user.UserId,
            MerchantId = recommendation.Merchant.Id > 0 ? recommendation.Merchant.Id : null,
            RecommendedUserCardId = recommendation.RecommendedCard.Card.Id,
            CategoryId = categoryId,
            ExpectedRewardRate = recommendation.RecommendedCard.ExpectedRewardRate,
            ExpectedRewardAmount = recommendation.RecommendedCard.ExpectedReward.Amount,
            ContextId = contextId,
            GeneratedAt = now,
            CreatedAt = now
        };
        db.Recommendations.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        return recommendation with { Id = entity.Id };
    }
}
