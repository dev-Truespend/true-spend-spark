using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using TrueSpend.WorkerService.Jobs;

namespace TrueSpend.WorkerService.Extensions;

/// <summary>
/// Minimal HTTP surface for the worker: a health probe plus manual job triggers.
/// The trigger endpoints are unauthenticated and intended for local/Postman use; they
/// run a job once on demand regardless of its <c>Enabled</c> flag or cron schedule.
/// Do not expose these routes on a public ingress.
/// </summary>
public static class JobTriggerEndpoints
{
    public static void MapJobTriggerEndpoints(this WebApplication app)
    {
        app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

        // List the jobs that can be triggered manually.
        app.MapGet("/jobs", () => Results.Ok(JobRegistry.Runners.Keys.OrderBy(k => k)));

        // Trigger a single job by name and run it once, in its own DI scope.
        app.MapPost("/jobs/{name}/run", async (
            string name,
            IServiceScopeFactory scopeFactory,
            ILoggerFactory loggerFactory,
            CancellationToken cancellationToken) =>
        {
            var logger = loggerFactory.CreateLogger("JobTrigger");

            if (!JobRegistry.Runners.TryGetValue(name, out var runner))
            {
                return Results.NotFound(new
                {
                    error = $"Unknown job '{name}'.",
                    available = JobRegistry.Runners.Keys.OrderBy(k => k)
                });
            }

            var startedAt = DateTimeOffset.UtcNow;
            logger.LogInformation("Manual trigger requested for {Job}.", name);
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                await runner(scope.ServiceProvider, cancellationToken);

                var finishedAt = DateTimeOffset.UtcNow;
                logger.LogInformation("Manual trigger of {Job} succeeded in {Seconds:F1}s.", name, (finishedAt - startedAt).TotalSeconds);
                return Results.Ok(new { job = name, status = "succeeded", startedAt, finishedAt });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Manual trigger of {Job} failed.", name);
                return Results.Json(
                    new { job = name, status = "failed", error = ex.Message, startedAt, finishedAt = DateTimeOffset.UtcNow },
                    statusCode: StatusCodes.Status500InternalServerError);
            }
        });
    }
}
