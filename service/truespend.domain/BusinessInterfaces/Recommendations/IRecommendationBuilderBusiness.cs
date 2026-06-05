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

namespace TrueSpend.Domain.BusinessInterfaces.Recommendations;

public interface IRecommendationBuilderBusiness
{
    Task<Recommendation?> BuildAsync(
        OnboardingWorkflowUser user,
        Merchant merchant,
        string categoryCode,
        decimal amount,
        CancellationToken cancellationToken);

    Task<Recommendation?> BuildAsync(
        OnboardingWorkflowUser user,
        Merchant merchant,
        string categoryCode,
        decimal amount,
        string contextCode,
        CancellationToken cancellationToken);
}
