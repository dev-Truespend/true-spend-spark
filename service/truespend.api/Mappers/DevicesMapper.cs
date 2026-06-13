using TrueSpend.Api.ViewModels.Devices;
using DomainRegister = TrueSpend.Domain.Models.Devices.RegisterDeviceRequest;
using DomainUpdate = TrueSpend.Domain.Models.Devices.UpdateDeviceRequest;
using DomainDevice = TrueSpend.Domain.Models.Devices.DeviceResponse;

namespace TrueSpend.Api.Mappers;

public interface IDevicesMapper
{
    DomainRegister ToDomain(RegisterDeviceRequestVm request);
    DomainUpdate ToDomain(UpdateDeviceRequestVm request);
    DeviceResponseVm ToResponse(DomainDevice domain);
}

public sealed class DevicesMapper : IDevicesMapper
{
    public DomainRegister ToDomain(RegisterDeviceRequestVm request) =>
        new(request.PlatformCode, request.PushToken, request.DeviceName, request.AppVersion, request.OsVersion, request.Locale, request.Timezone, request.InstallationId);

    public DomainUpdate ToDomain(UpdateDeviceRequestVm request) =>
        new(request.PushToken, request.DeviceName, request.AppVersion, request.OsVersion, request.Locale, request.Timezone);

    public DeviceResponseVm ToResponse(DomainDevice domain) => new(domain.DeviceId, domain.Registered);
}
