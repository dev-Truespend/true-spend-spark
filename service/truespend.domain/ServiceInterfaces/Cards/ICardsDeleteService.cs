using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.ServiceInterfaces.Cards;

public interface ICardsDeleteService
{
    Task<bool> SoftDeleteCardAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
}
