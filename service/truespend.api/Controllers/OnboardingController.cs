using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Onboarding;
using TrueSpend.Domain.BusinessInterfaces.Onboarding;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class OnboardingController(
    IOnboardingReadBusiness readBusiness,
    IOnboardingUpdateBusiness updateBusiness,
    IOnboardingMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetOnboardingAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpPost]
    public async Task<IActionResult> Update(UpdateOnboardingRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateOnboardingAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);

    [HttpPost("skip-card-linking")]
    public async Task<IActionResult> SkipCardLinking(CancellationToken cancellationToken) =>
        Respond(await updateBusiness.SkipCardLinkingAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpPost("complete")]
    public async Task<IActionResult> Complete(CancellationToken cancellationToken) =>
        Respond(await updateBusiness.CompleteOnboardingAsync(CurrentUser(), cancellationToken), mapper.ToResponse);
}
