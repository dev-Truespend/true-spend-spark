using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Auth;

public sealed record AuthBootstrapPermissionsVm(
    string Location,
    string Camera,
    string Notifications,
    DeviceRequestVm? Device,
    DateTimeOffset LastReportedAt);
