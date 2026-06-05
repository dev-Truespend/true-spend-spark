using TrueSpend.Domain.BusinessInterfaces.Permissions;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Permissions;

public sealed class PermissionsUpdateBusiness(
    IPermissionsReadService permissionsReadService,
    IPermissionsUpdateService permissionsUpdateService,
    IOnboardingReadService onboardingReadService,
    IOnboardingUpdateService onboardingUpdateService,
    IUnitOfWork unitOfWork,
    PermissionsValidator validator) : IPermissionsUpdateBusiness
{
    public async Task<BusinessResponse<PermissionsResponse>> UpdatePermissionsAsync(
        OnboardingWorkflowUser user,
        UpdatePermissionsRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateUpdatePermissions(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<PermissionsResponse>.Fail(errors, 400);
        }

        PermissionsResponse saved;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            var current = await permissionsReadService.GetPermissionsAsync(user, cancellationToken);
            var deviceId = await permissionsUpdateService.EnsureDeviceIdAsync(user, request.DeviceId, cancellationToken);
            var next = new PermissionsResponse(
                request.Location?.State ?? current.Location,
                request.Camera?.State ?? current.Camera,
                request.Notifications?.State ?? current.Notifications,
                deviceId,
                DateTimeOffset.UtcNow);
            saved = await permissionsUpdateService.SavePermissionsAsync(user, next, cancellationToken);

            var onboarding = await onboardingReadService.GetOnboardingAsync(user, cancellationToken);
            if (!onboarding.Completed && onboarding.CurrentStepCode == OnboardingConstants.LocationPermissionStepCode)
            {
                await onboardingUpdateService.SaveOnboardingAsync(user, onboarding with { CurrentStepCode = OnboardingConstants.PlanSelectionStepCode }, cancellationToken);
            }

            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<PermissionsResponse>.Ok(saved);
    }
}
