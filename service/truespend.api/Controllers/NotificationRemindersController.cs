using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Notifications;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/notification-reminders")]
public sealed class NotificationRemindersController(
    INotificationsReadBusiness readBusiness,
    INotificationRemindersBusiness remindersBusiness,
    INotificationsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetRemindersAsync(CurrentUser(), cancellationToken), mapper.ToReminders);

    [HttpPost]
    public async Task<IActionResult> Create(CreateNotificationReminderRequestVm request, CancellationToken cancellationToken) =>
        Respond(await remindersBusiness.CreateReminderAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToReminders);

    [HttpPost("{reminderId:int}/delete")]
    public async Task<IActionResult> Delete(int reminderId, CancellationToken cancellationToken) =>
        Respond(await remindersBusiness.DeleteReminderAsync(CurrentUser(), reminderId, cancellationToken), mapper.ToReminders);
}
