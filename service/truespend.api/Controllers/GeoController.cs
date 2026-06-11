using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Geo;
using TrueSpend.Domain.BusinessInterfaces.Geo;

namespace TrueSpend.Api.Controllers;

// Custom-provider arrival ingress (10a). JWT-authed: userId comes from the token claims, never the
// body, so a device cannot assert arrivals for another user. Maps to the neutral GeoArrivalInput and
// hands off to the same shared handler the Foursquare webhook uses.
[ApiController]
[Authorize]
[Route("api/v1/geo")]
public sealed class GeoController(
    IGeoArrivalBusiness arrivalBusiness,
    IGeoMapper geoMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost("arrival")]
    public async Task<IActionResult> Arrival(GeoArrivalRequestVm request, CancellationToken cancellationToken)
    {
        var input = geoMapper.ToArrivalInput(request, CurrentUser().UserId);
        return Respond(await arrivalBusiness.HandleArrivalAsync(input, cancellationToken), geoMapper.ToAckResponse);
    }
}
