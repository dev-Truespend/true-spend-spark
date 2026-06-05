using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Domain.BusinessInterfaces.Permissions;

public interface IPermissionsReadBusiness
{
    Task<BusinessResponse<PermissionsResponse>> GetPermissionsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
