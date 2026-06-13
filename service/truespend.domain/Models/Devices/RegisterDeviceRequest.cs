namespace TrueSpend.Domain.Models.Devices;

public sealed record RegisterDeviceRequest(string PlatformCode, string? PushToken, string? DeviceName, string? AppVersion, string? OsVersion, string? Locale, string? Timezone, string? InstallationId = null);
