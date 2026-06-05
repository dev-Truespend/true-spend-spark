using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Transactions;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/missed-rewards")]
public sealed class MissedRewardsController(
    ITransactionsReadBusiness readBusiness,
    ITransactionsUpdateBusiness updateBusiness,
    ITransactionsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> GetMissedRewards(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetMissedRewardsAsync(CurrentUser(), cancellationToken), mapper.ToMissedRewards);

    [HttpPost("{missedRewardId:int}/not-a-miss")]
    public async Task<IActionResult> MarkNotAMiss(int missedRewardId, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.MarkNotAMissAsync(CurrentUser(), missedRewardId, cancellationToken), mapper.ToDetail);
}
