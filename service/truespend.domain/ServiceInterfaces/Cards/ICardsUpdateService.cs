using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.ServiceInterfaces.Cards;

public interface ICardsUpdateService
{
    Task<CardSummary?> FindCardAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
    Task<CardSummary> UpdateCardAsync(OnboardingWorkflowUser user, int cardId, UpdateCardRequest request, CancellationToken cancellationToken);
    Task SetPrimaryAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
    Task UpsertRewardOverrideAsync(OnboardingWorkflowUser user, int cardId, UpsertRewardOverrideRequest request, CancellationToken cancellationToken);
    Task DeleteRewardOverrideAsync(OnboardingWorkflowUser user, int cardId, DeleteRewardOverrideRequest request, CancellationToken cancellationToken);
}
