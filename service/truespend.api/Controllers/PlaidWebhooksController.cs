using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Filters;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Plaid;

namespace TrueSpend.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/webhooks/plaid")]
public sealed class PlaidWebhooksController(
    IPlaidWebhookBusiness business,
    IPlaidMapper plaidMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost]
    [ServiceFilter(typeof(PlaidSignatureFilter))]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        var rawBody = HttpContext.Items["PlaidRawBody"] as string ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return BadRequest();
        }

        var input = plaidMapper.ParsePlaidWebhook(rawBody);
        var response = await business.HandleEventAsync(input, cancellationToken);
        return Respond(response, plaidMapper.ToWebhookAck);
    }
}
