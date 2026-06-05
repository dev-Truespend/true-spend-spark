namespace TrueSpend.Api.ViewModels.Devices;

public sealed record UpdateDeviceRequestVm(
    string? PushToken,
    string? DeviceName,
    string? AppVersion,
    string? OsVersion,
    string? Locale,
    string? Timezone);
