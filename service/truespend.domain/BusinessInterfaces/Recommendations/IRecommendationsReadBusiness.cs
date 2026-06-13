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
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.BusinessInterfaces.Recommendations;

public interface IRecommendationsReadBusiness
{
    Task<BusinessResponse<RecommendationResponse>> GetHomeAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);

    Task<BusinessResponse<NearbyMerchantsResult>> GetNearbyMerchantsAsync(OnboardingWorkflowUser user, NearbyMerchantsRequest request, CancellationToken cancellationToken);

    Task<BusinessResponse<NearbyMerchantsResult>> SearchPlacesAsync(OnboardingWorkflowUser user, SearchPlacesRequest request, CancellationToken cancellationToken);
}
