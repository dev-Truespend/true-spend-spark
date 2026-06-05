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
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Recommendations;

public sealed class RecommendationsUpdateBusiness(
    IRecommendationsReadService readService,
    IRecommendationBuilderBusiness builder,
    RecommendationsValidator validator) : IRecommendationsUpdateBusiness
{
    public async Task<BusinessResponse<RecommendationResponse>> UpdateCategoryAsync(
        OnboardingWorkflowUser user,
        UpdateRecommendationCategoryRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateCategoryUpdate(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<RecommendationResponse>.Fail(errors, 400);
        }

        var existing = await readService.GetRecommendationAsync(request.RecommendationId, cancellationToken);
        if (existing is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["Recommendation not found."], 404);
        }

        var recommendation = await builder.BuildAsync(user, existing.Merchant, request.CategoryCode, 25m, cancellationToken);
        if (recommendation is null)
        {
            return BusinessResponse<RecommendationResponse>.Fail(["No eligible cards. Add a card to get a recommendation."], 404);
        }
        return BusinessResponse<RecommendationResponse>.Ok(new RecommendationResponse(recommendation, null));
    }
}
