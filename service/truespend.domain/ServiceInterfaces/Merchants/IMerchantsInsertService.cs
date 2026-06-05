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

namespace TrueSpend.Domain.ServiceInterfaces.Merchants;

public interface IMerchantsInsertService
{
    Task<Merchant> SaveMerchantAsync(
        string name,
        string? provider,
        string? providerPlaceId,
        string categoryCode,
        bool isMultiCategory,
        string? address,
        CancellationToken cancellationToken);

    Task<MerchantVisit> RecordVisitAsync(
        OnboardingWorkflowUser user,
        int merchantId,
        string selectedCategoryCode,
        DateTimeOffset visitedAt,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<MerchantVisit>> GetVisitsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
