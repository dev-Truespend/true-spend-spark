using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Devices;
using TrueSpend.Domain.BusinessInterfaces.Devices;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class DevicesController(
    IDevicesInsertBusiness insertBusiness,
    IDevicesUpdateBusiness updateBusiness,
    IDevicesMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost]
    public async Task<IActionResult> Register(RegisterDeviceRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.RegisterDeviceAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);

    [HttpPost("{deviceId:int}")]
    public async Task<IActionResult> Update(int deviceId, UpdateDeviceRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateDeviceAsync(CurrentUser(), deviceId, mapper.ToDomain(request), cancellationToken), mapper.ToResponse);

    [HttpPost("delete")]
    public async Task<IActionResult> Delete(DeleteDeviceRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.DeactivateDeviceAsync(CurrentUser(), request.DeviceId, cancellationToken), mapper.ToResponse);
}
