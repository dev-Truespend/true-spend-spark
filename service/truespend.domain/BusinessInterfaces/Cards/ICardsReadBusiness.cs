using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.BusinessInterfaces.Cards;

public interface ICardsReadBusiness
{
    Task<BusinessResponse<CardsResponse>> GetCardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<CardLimitsResponse>> GetCardLimitsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<CardDetailResponse>> GetCardDetailAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
    Task<BusinessResponse<RewardOverridesResponse>> GetRewardOverridesAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
}
