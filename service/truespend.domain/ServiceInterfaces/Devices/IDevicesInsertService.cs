using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.ServiceInterfaces.Devices;

public interface IDevicesInsertService
{
    Task<int> RegisterDeviceAsync(OnboardingWorkflowUser user, RegisterDeviceRequest request, CancellationToken cancellationToken);
}
