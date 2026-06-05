using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.ServiceInterfaces.Cards;

public interface ICardsReadService
{
    Task<IReadOnlyList<CardSummary>> GetCardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<CardDetailResponse?> GetCardDetailAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
    Task<RewardOverridesResponse> GetRewardOverridesAsync(int cardId, CancellationToken cancellationToken);
    Task<string> CurrentPlanCodeAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<int> CountActiveUserCardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
