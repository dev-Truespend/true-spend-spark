using TrueSpend.Domain.BusinessInterfaces.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Permissions;

namespace TrueSpend.Domain.Business.Permissions;

public sealed class PermissionsReadBusiness(IPermissionsReadService readService) : IPermissionsReadBusiness
{
    public async Task<BusinessResponse<PermissionsResponse>> GetPermissionsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var permissions = await readService.GetPermissionsAsync(user, cancellationToken);
        return BusinessResponse<PermissionsResponse>.Ok(permissions);
    }
}
