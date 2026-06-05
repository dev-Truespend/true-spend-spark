using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Domain.BusinessInterfaces.Permissions;

public interface IPermissionsUpdateBusiness
{
    Task<BusinessResponse<PermissionsResponse>> UpdatePermissionsAsync(
        OnboardingWorkflowUser user,
        UpdatePermissionsRequest request,
        CancellationToken cancellationToken);
}
