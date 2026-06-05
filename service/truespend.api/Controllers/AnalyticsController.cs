using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.Analytics;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/analytics")]
public sealed class AnalyticsController(
    IAnalyticsReadBusiness readBusiness,
    IAnalyticsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet("rewards-summary")]
    public async Task<IActionResult> GetRewardsSummary([FromQuery] string periodCode, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetRewardsSummaryAsync(CurrentUser(), mapper.ToDomain(periodCode), cancellationToken), mapper.ToRewardsSummary);

    [HttpGet("missed-rewards-summary")]
    public async Task<IActionResult> GetMissedRewardsSummary([FromQuery] string periodCode, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetMissedRewardsSummaryAsync(CurrentUser(), mapper.ToDomain(periodCode), cancellationToken), mapper.ToMissedRewardsSummary);
}
