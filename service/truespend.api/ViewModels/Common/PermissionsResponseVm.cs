namespace TrueSpend.Api.ViewModels.Common;

public sealed record PermissionsResponseVm(
    string Location,
    string Camera,
    string Notifications,
    int? DeviceId,
    DateTimeOffset LastReportedAt);
