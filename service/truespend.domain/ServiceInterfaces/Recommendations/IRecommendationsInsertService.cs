using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.ServiceInterfaces.Recommendations;

public interface IRecommendationsInsertService
{
    Task<Recommendation> SaveRecommendationAsync(
        OnboardingWorkflowUser user,
        Recommendation recommendation,
        CancellationToken cancellationToken);

    Task<Recommendation> SaveRecommendationAsync(
        OnboardingWorkflowUser user,
        Recommendation recommendation,
        string contextCode,
        CancellationToken cancellationToken);
}
