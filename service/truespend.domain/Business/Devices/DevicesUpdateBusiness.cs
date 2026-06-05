using TrueSpend.Domain.BusinessInterfaces.Devices;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Devices;

public sealed class DevicesUpdateBusiness(IDevicesUpdateService updateService) : IDevicesUpdateBusiness
{
    public async Task<BusinessResponse<DeviceResponse>> UpdateDeviceAsync(
        OnboardingWorkflowUser user,
        int deviceId,
        UpdateDeviceRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await updateService.UpdateDeviceAsync(user, deviceId, request, cancellationToken);
        return updated
            ? BusinessResponse<DeviceResponse>.Ok(new DeviceResponse(deviceId, true))
            : BusinessResponse<DeviceResponse>.Fail(["Device not found."], 404);
    }

    public async Task<BusinessResponse<DeviceResponse>> DeactivateDeviceAsync(
        OnboardingWorkflowUser user,
        int deviceId,
        CancellationToken cancellationToken)
    {
        var deactivated = await updateService.DeactivateDeviceAsync(user, deviceId, cancellationToken);
        return deactivated
            ? BusinessResponse<DeviceResponse>.Ok(new DeviceResponse(deviceId, false))
            : BusinessResponse<DeviceResponse>.Fail(["Device not found."], 404);
    }

    public Task<DeviceCleanupResult> CleanupInvalidDeviceTokensAsync(
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var since = now - NotificationsConstants.InvalidDeviceTokenLookback;
        return updateService.DeactivateDevicesWithInvalidTokensAsync(
            since,
            NotificationsConstants.InvalidPushTokenErrorCodes,
            cancellationToken);
    }
}
