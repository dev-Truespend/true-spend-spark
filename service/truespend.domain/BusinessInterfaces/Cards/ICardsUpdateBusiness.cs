using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.BusinessInterfaces.Cards;

public interface ICardsUpdateBusiness
{
    Task<BusinessResponse<CardDetailResponse>> UpdateCardAsync(OnboardingWorkflowUser user, int cardId, UpdateCardRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<CardsResponse>> SetPrimaryAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
    Task<BusinessResponse<RewardOverridesResponse>> UpsertRewardOverrideAsync(OnboardingWorkflowUser user, int cardId, UpsertRewardOverrideRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<RewardOverridesResponse>> DeleteRewardOverrideAsync(OnboardingWorkflowUser user, int cardId, DeleteRewardOverrideRequest request, CancellationToken cancellationToken);
}
