namespace TrueSpend.Api.ViewModels.Permissions;

public sealed record UpdatePermissionsRequestVm(
    int? DeviceId,
    string PlatformCode,
    PermissionInputVm? Location,
    PermissionInputVm? Camera,
    PermissionInputVm? Notifications,
    string? RawPlatformPayload);
