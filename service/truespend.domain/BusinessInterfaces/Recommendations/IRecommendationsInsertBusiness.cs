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

namespace TrueSpend.Domain.BusinessInterfaces.Recommendations;

public interface IRecommendationsInsertBusiness
{
    Task<BusinessResponse<RecommendationResponse>> GetInStoreRecommendationAsync(
        OnboardingWorkflowUser user,
        InStoreRecommendationRequest request,
        CancellationToken cancellationToken);

    Task<BusinessResponse<RecommendationResponse>> RefreshRecommendationAsync(
        OnboardingWorkflowUser user,
        RefreshRecommendationRequest request,
        CancellationToken cancellationToken);

    Task<BusinessResponse<RecommendationResponse>> GetNearbyRecommendationAsync(
        OnboardingWorkflowUser user,
        NearbyRecommendationRequest request,
        CancellationToken cancellationToken);
}
