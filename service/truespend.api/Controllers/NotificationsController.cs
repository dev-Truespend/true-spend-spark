using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Notifications;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/notifications")]
public sealed class NotificationsController(
    INotificationsReadBusiness readBusiness,
    INotificationsUpdateBusiness updateBusiness,
    INotificationsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] string filter = "all", CancellationToken cancellationToken = default) =>
        Respond(await readBusiness.GetNotificationsAsync(CurrentUser(), filter, cancellationToken), mapper.ToResponse);

    [HttpGet("{notificationId:int}")]
    public async Task<IActionResult> GetDetail(int notificationId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetNotificationDetailAsync(CurrentUser(), notificationId, cancellationToken), mapper.ToDetail);

    [HttpPost("{notificationId:int}/read")]
    public async Task<IActionResult> MarkRead(int notificationId, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.MarkReadAsync(CurrentUser(), notificationId, cancellationToken), mapper.ToResponse);

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken) =>
        Respond(await updateBusiness.MarkAllReadAsync(CurrentUser(), cancellationToken), mapper.ToResponse);
}
