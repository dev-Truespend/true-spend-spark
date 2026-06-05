namespace TrueSpend.Domain.Models.Devices;

public sealed record UpdateDeviceRequest(string? PushToken, string? DeviceName, string? AppVersion, string? OsVersion, string? Locale, string? Timezone);
