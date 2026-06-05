using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.DbContext;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Insights;

namespace TrueSpend.Domain.Services.AIInsights;

public sealed class AIInsightsInsertService(TrueSpendDbContext db) : IAIInsightsInsertService
{
    private const string DefaultPromptVersion = "2026-05-01";

    public async Task<InsightGenerationRun> CreateGenerationRunAsync(Guid userId, CancellationToken cancellationToken)
    {
        const string pendingStatusCode = "pending";
        var pendingStatusId = await db.GenerationStatuses
            .AsNoTracking()
            .Where(x => x.Code == pendingStatusCode)
            .Select(x => x.Id)
            .FirstAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var run = new InsightGenerationRunEntity
        {
            UserId = userId,
            StatusId = pendingStatusId,
            PromptVersion = DefaultPromptVersion,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.InsightGenerationRuns.Add(run);
        await db.SaveChangesAsync(cancellationToken);
        return new InsightGenerationRun(run.Id, run.UserId, pendingStatusCode);
    }

    public async Task InsertInsightsAsync(int runId, Guid userId, IReadOnlyList<GeneratedInsight> insights, CancellationToken cancellationToken)
    {
        var insightTypeLookup = await db.AIInsightTypes
            .AsNoTracking()
            .ToDictionaryAsync(t => t.Code, t => t.Id, cancellationToken);

        var priorityLookup = await db.PriorityLevels
            .AsNoTracking()
            .ToDictionaryAsync(p => p.Code, p => p.Id, cancellationToken);

        var now = DateTimeOffset.UtcNow;

        foreach (var insight in insights)
        {
            if (!insightTypeLookup.TryGetValue(insight.TypeCode, out var typeId) ||
                !priorityLookup.TryGetValue(insight.PriorityCode, out var priorityId))
                continue;

            db.AIInsights.Add(new AIInsightEntity
            {
                UserId = userId,
                GenerationRunId = runId,
                InsightTypeId = typeId,
                PriorityId = priorityId,
                Title = insight.Title,
                Body = insight.Body,
                IsDismissed = false,
                GeneratedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
