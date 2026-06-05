using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Cards;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationsReadBusiness(ICardsReadService cardsReadService) : IRecommendationsReadBusiness
{
    public async Task<BusinessResponse<RecommendationResponse>> GetHomeAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var cards = await cardsReadService.GetCardsAsync(user, cancellationToken);
        if (cards.Count == 0)
        {
            return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(
                null,
                new HomeEmptyState(
                    "Add cards to unlock recommendations",
                    "Connect a bank or add a card manually to see which card wins at checkout.",
                    "add_manual_card",
                    "connect_bank",
                    "Pro unlocks unlimited card links.")));
        }

        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(null, null));
    }
}
