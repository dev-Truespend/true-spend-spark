namespace TrueSpend.Api.ViewModels.Common;

public sealed record DeviceRequestVm(
    string PlatformCode,
    string? PushToken,
    string? DeviceName,
    string? AppVersion,
    string? OsVersion);
