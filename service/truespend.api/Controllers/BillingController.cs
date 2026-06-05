using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Billing;
using TrueSpend.Domain.BusinessInterfaces.Billing;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class BillingController(
    IBillingReadBusiness readBusiness,
    IBillingInsertBusiness insertBusiness,
    IBillingMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet("countries")]
    public async Task<IActionResult> Countries(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetCountriesAsync(cancellationToken), mapper.ToCountries);

    [HttpGet("plans")]
    public async Task<IActionResult> Plans(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetPlansAsync(cancellationToken), mapper.ToPlans);

    [HttpGet("prices")]
    public async Task<IActionResult> Prices([FromQuery] string? countryCode, [FromQuery] string? periodCode, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetPricesAsync(CurrentUser(), countryCode, periodCode, cancellationToken), mapper.ToPrices);

    [HttpGet("features")]
    public async Task<IActionResult> Features(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetFeaturesAsync(cancellationToken), mapper.ToFeatures);

    [HttpGet("subscription")]
    public async Task<IActionResult> Subscription(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetSubscriptionAsync(CurrentUser(), cancellationToken), mapper.ToSubscription);

    [HttpGet("payment-methods")]
    public async Task<IActionResult> PaymentMethods(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetPaymentMethodsAsync(CurrentUser(), cancellationToken), mapper.ToPaymentMethods);

    [HttpGet("/api/v1/entitlements")]
    public async Task<IActionResult> Entitlements(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetEntitlementsAsync(CurrentUser(), cancellationToken), mapper.ToEntitlements);

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(CreateCheckoutSessionRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.CreateCheckoutAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToHosted);

    [HttpPost("portal")]
    public async Task<IActionResult> Portal(CancellationToken cancellationToken) =>
        Respond(await insertBusiness.CreatePortalAsync(CurrentUser(), cancellationToken), mapper.ToHosted);
}
