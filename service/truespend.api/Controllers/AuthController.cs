using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Auth;
using TrueSpend.Domain.BusinessInterfaces.Auth;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class AuthController(
    IAuthBootstrapBusiness authBootstrapBusiness,
    IAuthBootstrapMapper authMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost("bootstrap")]
    public async Task<IActionResult> Bootstrap(AuthBootstrapRequestVm request, CancellationToken cancellationToken)
    {
        var input = authMapper.ToInput(request, CurrentPrincipal());
        var response = await authBootstrapBusiness.BootstrapAsync(input, cancellationToken);
        return Respond(response, authMapper.ToResponse);
    }
}
