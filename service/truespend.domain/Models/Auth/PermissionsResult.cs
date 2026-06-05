namespace TrueSpend.Domain.Models.Auth;

public sealed record PermissionsResult(
    string Location,
    string Camera,
    string Notifications,
    DeviceInput? Device,
    DateTimeOffset LastReportedAt);
