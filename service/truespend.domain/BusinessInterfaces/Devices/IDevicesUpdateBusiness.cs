using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.BusinessInterfaces.Devices;

public interface IDevicesUpdateBusiness
{
    Task<BusinessResponse<DeviceResponse>> UpdateDeviceAsync(OnboardingWorkflowUser user, int deviceId, UpdateDeviceRequest request, CancellationToken cancellationToken);
    Task<BusinessResponse<DeviceResponse>> DeactivateDeviceAsync(OnboardingWorkflowUser user, int deviceId, CancellationToken cancellationToken);
    Task<DeviceCleanupResult> CleanupInvalidDeviceTokensAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
