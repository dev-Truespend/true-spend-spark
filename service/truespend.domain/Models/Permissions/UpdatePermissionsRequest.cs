namespace TrueSpend.Domain.Models.Permissions;

public sealed record UpdatePermissionsRequest(
    int? DeviceId,
    string PlatformCode,
    PermissionInput? Location,
    PermissionInput? Camera,
    PermissionInput? Notifications,
    string? RawPlatformPayload);
