using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.ServiceInterfaces.Cards;

public interface ICardsReadService
{
    Task<IReadOnlyList<CardSummary>> GetCardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<CardDetailResponse?> GetCardDetailAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken);
    Task<RewardOverridesResponse> GetRewardOverridesAsync(int cardId, CancellationToken cancellationToken);
    Task<int> CountActiveUserCardsBySourceAsync(OnboardingWorkflowUser user, string cardSource, CancellationToken cancellationToken);

    // Active manual cards (no Plaid account yet) whose last-four matches the given mask — candidates
    // for adoption when a Plaid account is linked. Returns empty when mask is null/blank.
    Task<IReadOnlyList<AdoptableManualCard>> FindAdoptableManualCardsAsync(Guid userId, string? mask, CancellationToken cancellationToken);
    Task<IReadOnlyList<PortfolioCard>> GetPortfolioAsync(OnboardingWorkflowUser user, int topCategoriesPerCard, CancellationToken cancellationToken);
}
