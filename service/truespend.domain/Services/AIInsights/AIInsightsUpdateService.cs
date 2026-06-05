using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.AIInsights;

public sealed class AIInsightsUpdateService(TrueSpendDbContext db) : IAIInsightsUpdateService
{
    public async Task DismissInsightAsync(int insightId, Guid userId, CancellationToken cancellationToken)
    {
        var insight = await db.AIInsights
            .Where(x => x.Id == insightId && x.UserId == userId && !x.IsDismissed)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundAppException(ExceptionMessages.AIInsightNotFound);

        insight.IsDismissed = true;
        insight.DismissedAt = DateTimeOffset.UtcNow;
        insight.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkRunInProgressAsync(int runId, CancellationToken cancellationToken)
    {
        var run = await db.InsightGenerationRuns.FindAsync([runId], cancellationToken)
            ?? throw new NotFoundAppException(ExceptionMessages.AIInsightGenerationRunNotFound);

        var statusId = await db.GenerationStatuses
            .AsNoTracking()
            .Where(x => x.Code == "in_progress")
            .Select(x => x.Id)
            .FirstAsync(cancellationToken);

        run.StatusId = statusId;
        run.StartedAt = DateTimeOffset.UtcNow;
        run.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkRunSucceededAsync(int runId, int insightsCreated, CancellationToken cancellationToken)
    {
        var run = await db.InsightGenerationRuns.FindAsync([runId], cancellationToken)
            ?? throw new NotFoundAppException(ExceptionMessages.AIInsightGenerationRunNotFound);

        var statusId = await db.GenerationStatuses
            .AsNoTracking()
            .Where(x => x.Code == "succeeded")
            .Select(x => x.Id)
            .FirstAsync(cancellationToken);

        run.StatusId = statusId;
        run.CompletedAt = DateTimeOffset.UtcNow;
        run.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkRunFailedAsync(int runId, string errorMessage, CancellationToken cancellationToken)
    {
        var run = await db.InsightGenerationRuns.FindAsync([runId], cancellationToken)
            ?? throw new NotFoundAppException(ExceptionMessages.AIInsightGenerationRunNotFound);

        var statusId = await db.GenerationStatuses
            .AsNoTracking()
            .Where(x => x.Code == "failed")
            .Select(x => x.Id)
            .FirstAsync(cancellationToken);

        run.StatusId = statusId;
        run.ErrorMessage = errorMessage;
        run.CompletedAt = DateTimeOffset.UtcNow;
        run.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }
}
