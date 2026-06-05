using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Auth;

public sealed record AuthBootstrapRequestVm(
    string? Locale,
    string? Timezone,
    string? CountryCode,
    DeviceRequestVm? Device);
