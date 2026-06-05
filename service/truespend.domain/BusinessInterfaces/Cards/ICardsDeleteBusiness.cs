using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.BusinessInterfaces.Cards;

public interface ICardsDeleteBusiness
{
    Task<BusinessResponse<CardsResponse>> DeleteCardAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
}
