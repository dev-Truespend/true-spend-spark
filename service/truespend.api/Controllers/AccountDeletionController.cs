using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Privacy;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/account-deletion")]
public sealed class AccountDeletionController(
    IAccountDeletionRequestBusiness requestBusiness,
    IAccountDeletionMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> GetStatus(CancellationToken cancellationToken) =>
        Respond(await requestBusiness.GetStatusAsync(CurrentUser(), cancellationToken), mapper.ToStatusResponse);

    [HttpPost]
    public async Task<IActionResult> Request(CancellationToken cancellationToken) =>
        Respond(await requestBusiness.RequestAsync(CurrentUser(), cancellationToken), mapper.ToStatusResponse);

    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel(CancellationToken cancellationToken) =>
        Respond(await requestBusiness.CancelAsync(CurrentUser(), cancellationToken), mapper.ToStatusResponse);
}
