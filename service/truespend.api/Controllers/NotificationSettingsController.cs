using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.NotificationSettings;
using TrueSpend.Domain.BusinessInterfaces.NotificationSettings;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/notification-settings")]
public sealed class NotificationSettingsController(
    INotificationSettingsReadBusiness readBusiness,
    INotificationSettingsUpdateBusiness updateBusiness,
    INotificationSettingsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetNotificationSettingsAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpPost]
    public async Task<IActionResult> Update(UpdateNotificationSettingsRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateNotificationSettingsAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);

    [HttpGet("types")]
    public async Task<IActionResult> Types(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetNotificationTypesAsync(CurrentUser(), cancellationToken), mapper.ToTypes);

    [HttpPost("types")]
    public async Task<IActionResult> UpdateTypePreference(UpdateNotificationTypePreferenceRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateNotificationTypePreferenceAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);
}
