namespace TrueSpend.Domain.Models.Auth;

public sealed record DeviceInput(
    string PlatformCode,
    string? PushToken,
    string? DeviceName,
    string? AppVersion,
    string? OsVersion);
