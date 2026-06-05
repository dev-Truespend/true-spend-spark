namespace TrueSpend.Domain.Models.Permissions;

public sealed record PermissionsResponse(string Location, string Camera, string Notifications, int? DeviceId, DateTimeOffset LastReportedAt);
