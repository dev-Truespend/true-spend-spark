using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Filters;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Geo;

namespace TrueSpend.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/webhooks/foursquare")]
public sealed class FoursquareWebhooksController(
    IFoursquareWebhookBusiness business,
    IGeoMapper geoMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost]
    [ServiceFilter(typeof(FoursquareSignatureFilter))]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        var rawBody = HttpContext.Items["FoursquareRawBody"] as string ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return BadRequest();
        }

        var input = geoMapper.ParseFoursquareEvent(rawBody);
        var response = await business.HandleEventAsync(input, cancellationToken);
        return Respond(response, geoMapper.ToAckResponse);
    }
}
