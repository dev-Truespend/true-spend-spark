using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;

namespace TrueSpend.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/ai-insights")]
public sealed class AIInsightsController(
    IAIInsightsReadBusiness readBusiness,
    IAIInsightsInsertBusiness insertBusiness,
    IAIInsightsUpdateBusiness updateBusiness,
    IAIInsightsMapper mapper,
    IClientResponseMapper clientResponseMapper,
    IWorkflowUserMapper workflowUserMapper) : AppControllerBase(clientResponseMapper, workflowUserMapper)
{
    [HttpGet]
    public async Task<IActionResult> GetInsights(CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetInsightsAsync(CurrentUser(), cancellationToken), mapper.ToInsightsResponse);

    [HttpPost("generate")]
    public async Task<IActionResult> Generate(CancellationToken cancellationToken) =>
        Respond(await insertBusiness.GenerateInsightsAsync(CurrentUser(), cancellationToken), mapper.ToGenerationResponse);

    [HttpGet("generation/{runId:int}")]
    public async Task<IActionResult> GetGenerationRun(int runId, CancellationToken cancellationToken) =>
        Respond(await readBusiness.GetGenerationRunAsync(CurrentUser(), runId, cancellationToken), mapper.ToGenerationResponse);

    [HttpPost("{insightId:int}/dismiss")]
    public async Task<IActionResult> Dismiss(int insightId, CancellationToken cancellationToken) =>
        Respond(await updateBusiness.DismissInsightAsync(CurrentUser(), insightId, cancellationToken), mapper.ToInsightsResponse);
}
