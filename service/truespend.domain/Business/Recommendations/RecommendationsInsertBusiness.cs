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
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationsInsertBusiness(
    IMerchantsReadService merchantsReadService,
    IRecommendationBuilderBusiness builder,
    RecommendationsValidator validator) : IRecommendationsInsertBusiness
{
    public async Task<BusinessResponse<RecommendationResponse>> GetInStoreRecommendationAsync(
        OnboardingWorkflowUser user,
        InStoreRecommendationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateInStoreRecommendation(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<RecommendationResponse>.Fail(errors, 400);
        }

        var merchant = await merchantsReadService.GetMerchantAsync(request.MerchantId, cancellationToken);
        if (merchant is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["Merchant not found."], 404);
        }

        var recommendation = await builder.BuildAsync(user, merchant, request.CategoryCode ?? merchant.CategoryCode, request.EstimatedAmount ?? 25m, cancellationToken);
        if (recommendation is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["No eligible cards. Add a card to get a recommendation."], 404);
        }
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(recommendation, null));
    }

    public async Task<BusinessResponse<RecommendationResponse>> RefreshRecommendationAsync(
        OnboardingWorkflowUser user,
        RefreshRecommendationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateRefreshRecommendation(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<RecommendationResponse>.Fail(errors, 400);
        }

        var merchant = await merchantsReadService.GetMerchantAsync(request.MerchantId, cancellationToken);
        if (merchant is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["Merchant not found."], 404);
        }

        var recommendation = await builder.BuildAsync(user, merchant, request.CategoryCode ?? merchant.CategoryCode, 25m, cancellationToken);
        if (recommendation is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["No eligible cards. Add a card to get a recommendation."], 404);
        }
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(recommendation, null));
    }
}
