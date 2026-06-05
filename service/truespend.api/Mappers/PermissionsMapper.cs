using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Permissions;
using DomainUpdate = TrueSpend.Domain.Models.Permissions.UpdatePermissionsRequest;
using DomainInput = TrueSpend.Domain.Models.Permissions.PermissionInput;
using DomainResponse = TrueSpend.Domain.Models.Permissions.PermissionsResponse;

namespace TrueSpend.Api.Mappers;

public interface IPermissionsMapper
{
    DomainUpdate ToDomain(UpdatePermissionsRequestVm request);
    PermissionsResponseVm ToResponse(DomainResponse domain);
}

public sealed class PermissionsMapper : IPermissionsMapper
{
    public DomainUpdate ToDomain(UpdatePermissionsRequestVm request) =>
        new(
            request.DeviceId,
            request.PlatformCode,
            request.Location is null ? null : new DomainInput(request.Location.State, request.Location.Accuracy),
            request.Camera is null ? null : new DomainInput(request.Camera.State, request.Camera.Accuracy),
            request.Notifications is null ? null : new DomainInput(request.Notifications.State, request.Notifications.Accuracy),
            request.RawPlatformPayload);

    public PermissionsResponseVm ToResponse(DomainResponse domain) =>
        new(domain.Location, domain.Camera, domain.Notifications, domain.DeviceId, domain.LastReportedAt);
}
