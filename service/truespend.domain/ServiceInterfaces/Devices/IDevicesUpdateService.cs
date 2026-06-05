using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.Devices;

public interface IDevicesUpdateService
{
    Task<bool> UpdateDeviceAsync(OnboardingWorkflowUser user, int deviceId, UpdateDeviceRequest request, CancellationToken cancellationToken);
    Task<bool> DeactivateDeviceAsync(OnboardingWorkflowUser user, int deviceId, CancellationToken cancellationToken);
    Task<DeviceCleanupResult> DeactivateDevicesWithInvalidTokensAsync(
        DateTimeOffset since,
        IReadOnlyCollection<string> errorCodes,
        CancellationToken cancellationToken);
}
