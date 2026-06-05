using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Cards;

public sealed class CardsReadBusiness(ICardsReadService service) : ICardsReadBusiness
{
    public async Task<BusinessResponse<CardsResponse>> GetCardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var cards = await service.GetCardsAsync(user, cancellationToken);
        var planCode = await service.CurrentPlanCodeAsync(user, cancellationToken);
        return BusinessResponse<CardsResponse>.Ok(new CardsResponse(cards, CardLimitsCalculator.Calculate(cards, planCode)));
    }

    public async Task<BusinessResponse<CardLimitsResponse>> GetCardLimitsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var cards = await service.GetCardsAsync(user, cancellationToken);
        var planCode = await service.CurrentPlanCodeAsync(user, cancellationToken);
        return BusinessResponse<CardLimitsResponse>.Ok(CardLimitsCalculator.Calculate(cards, planCode));
    }

    public async Task<BusinessResponse<CardDetailResponse>> GetCardDetailAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken)
    {
        var detail = await service.GetCardDetailAsync(user, cardId, cancellationToken);
        return detail is null
            ? BusinessResponse<CardDetailResponse>.Fail(["Card not found."], 404)
            : BusinessResponse<CardDetailResponse>.Ok(detail);
    }

    public async Task<BusinessResponse<RewardOverridesResponse>> GetRewardOverridesAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken)
    {
        var detail = await service.GetCardDetailAsync(user, cardId, cancellationToken);
        if (detail is null) return BusinessResponse<RewardOverridesResponse>.Fail(["Card not found."], 404);

        var overrides = await service.GetRewardOverridesAsync(cardId, cancellationToken);
        return BusinessResponse<RewardOverridesResponse>.Ok(overrides);
    }

}
