using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Profile;
using TrueSpend.Domain.BusinessInterfaces.Profile;
using TrueSpend.Domain.Models.Profile;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class ProfileController(
    IProfileReadBusiness readBusiness,
    IProfileUpdateBusiness updateBusiness,
    IProfileMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetProfileAsync(CurrentUser(), cancellationToken), mapper.ToResponse);

    [HttpPost]
    public async Task<IActionResult> Update(UpdateProfileRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.UpdateProfileAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToResponse);

    [HttpPost("avatar")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> UploadAvatar([FromForm(Name = "file")] IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length <= 0)
        {
            return BadRequest(ClientResponseMapper.ToClientResponse(
                Domain.Models.Common.BusinessResponse<ProfileResponse>.Fail(["Avatar file is required."], 400)));
        }

        await using var stream = file.OpenReadStream();
        var request = new UploadAvatarRequest(stream, file.FileName, file.ContentType, file.Length);
        var response = await updateBusiness.UploadAvatarAsync(CurrentUser(), request, cancellationToken);
        return Respond(response, mapper.ToResponse);
    }
}
