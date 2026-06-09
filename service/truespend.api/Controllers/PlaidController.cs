using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Api.ViewModels.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Plaid;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/[controller]")]
public sealed class PlaidController(
    IPlaidInsertBusiness insertBusiness,
    IPlaidReadBusiness readBusiness,
    IPlaidUpdateBusiness updateBusiness,
    IManualResyncQuotaBusiness resyncQuotaBusiness,
    IPlaidMapper mapper,
    ICardsMapper cardsMapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpPost("link-token")]
    public async Task<IActionResult> LinkToken(CancellationToken cancellationToken) =>
        Respond(await insertBusiness.CreatePlaidLinkTokenAsync(CurrentUser(), cancellationToken), mapper.ToLinkToken);

    [HttpPost("exchange-token")]
    public async Task<IActionResult> ExchangeToken(ExchangePlaidTokenRequestVm request, CancellationToken cancellationToken) =>
        Respond(await insertBusiness.ExchangePlaidTokenAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToConnection(domain, cardsMapper));

    [HttpGet("connections")]
    public async Task<IActionResult> GetConnections(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetConnectionsAsync(CurrentUser(), cancellationToken), mapper.ToConnections);

    [HttpPost("connections/sync")]
    public async Task<IActionResult> SyncConnection(SyncPlaidConnectionRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.SyncConnectionAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToConnection(domain, cardsMapper));

    [HttpPost("connections/reconnect")]
    public async Task<IActionResult> ReconnectConnection(ReconnectPlaidConnectionRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.ReconnectConnectionAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToLinkToken);

    [HttpPost("connections/disconnect")]
    public async Task<IActionResult> DisconnectConnection(DisconnectPlaidConnectionRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.DisconnectConnectionAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), domain => mapper.ToConnection(domain, cardsMapper));

    [HttpPost("transactions/sync")]
    public async Task<IActionResult> SyncTransactions(SyncPlaidTransactionsRequestVm request, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.SyncPlaidTransactionsAsync(CurrentUser(), mapper.ToDomain(request), cancellationToken), mapper.ToTransactionSync);

    [HttpGet("resync-quota")]
    public async Task<IActionResult> GetResyncQuota(CancellationToken cancellationToken) =>
        Respond(await resyncQuotaBusiness.GetStatusAsync(CurrentUser(), cancellationToken), mapper.ToResyncQuota);
}
