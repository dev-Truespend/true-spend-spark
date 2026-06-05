using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Filters;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Billing;

namespace TrueSpend.Api.Controllers;

[ApiController]
[AllowAnonymous]
[Route("api/v1/webhooks/stripe")]
public sealed class StripeWebhooksController(
    IStripeWebhookBusiness business,
    IBillingMapper billingMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost]
    [ServiceFilter(typeof(StripeSignatureFilter))]
    public async Task<IActionResult> Receive(CancellationToken cancellationToken)
    {
        var rawBody = HttpContext.Items["StripeRawBody"] as string ?? string.Empty;
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return BadRequest();
        }

        var input = billingMapper.ParseStripeWebhook(rawBody);
        var response = await business.HandleEventAsync(input, cancellationToken);
        return Respond(response, billingMapper.ToWebhookAck);
    }
}
