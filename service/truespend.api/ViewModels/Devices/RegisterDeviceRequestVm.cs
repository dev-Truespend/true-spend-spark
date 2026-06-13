namespace TrueSpend.Api.ViewModels.Devices;

public sealed record RegisterDeviceRequestVm(
    string PlatformCode,
    string? PushToken,
    string? DeviceName,
    string? AppVersion,
    string? OsVersion,
    string? Locale,
    string? Timezone,
    string? InstallationId = null);
