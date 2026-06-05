using TrueSpend.Domain.BusinessInterfaces.Devices;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Devices;

public sealed class DevicesInsertBusiness(IDevicesInsertService devicesInsertService, DevicesValidator validator) : IDevicesInsertBusiness
{
    public async Task<BusinessResponse<DeviceResponse>> RegisterDeviceAsync(
        OnboardingWorkflowUser user,
        RegisterDeviceRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateRegisterDevice(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<DeviceResponse>.Fail(errors, 400);
        }

        var deviceId = await devicesInsertService.RegisterDeviceAsync(user, request, cancellationToken);
        return BusinessResponse<DeviceResponse>.Ok(new DeviceResponse(deviceId, true));
    }
}
