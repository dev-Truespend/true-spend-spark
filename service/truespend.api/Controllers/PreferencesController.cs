using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Preferences;
using TrueSpend.Domain.BusinessInterfaces.Preferences;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class PreferencesController(
    IPreferencesReadBusiness readBusiness,
    IPreferencesUpdateBusiness updateBusiness,
    IPreferencesMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetPreferencesAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpPost]
    public async Task<IActionResult> Update(UpdatePreferencesRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdatePreferencesAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);
}
