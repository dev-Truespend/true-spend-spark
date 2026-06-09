using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.AIInsights;

public sealed class AIInsightsReadService(TrueSpendDbContext db) : IAIInsightsReadService
{
    public async Task<IReadOnlyList<AIInsight>> GetActiveInsightsAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await (from insight in db.AIInsights.AsNoTracking()
                          .Where(x => x.UserId == userId && !x.IsDismissed)
                      join insightType in db.AIInsightTypes.AsNoTracking() on insight.InsightTypeId equals insightType.Id
                      join priority in db.PriorityLevels.AsNoTracking() on insight.PriorityId equals priority.Id
                      orderby priority.SortOrder, insight.GeneratedAt descending
                      select new AIInsight(
                          insight.Id,
                          insightType.Code,
                          priority.Code,
                          insight.Title,
                          insight.Body,
                          insight.GeneratedAt))
                     .ToListAsync(cancellationToken);
    }

    public async Task<InsightGenerationRun?> GetRunAsync(int runId, CancellationToken cancellationToken) =>
        await (from run in db.InsightGenerationRuns.AsNoTracking().Where(x => x.Id == runId)
               join status in db.GenerationStatuses.AsNoTracking() on run.StatusId equals status.Id
               select new InsightGenerationRun(run.Id, run.UserId, status.Code))
              .FirstOrDefaultAsync(cancellationToken);

    #region archive — pending-runs query (no user-facing generate in MVP)
    // public async Task<IReadOnlyList<InsightGenerationRun>> GetPendingRunsAsync(CancellationToken cancellationToken) =>
    //     await (from run in db.InsightGenerationRuns.AsNoTracking()
    //            join status in db.GenerationStatuses.AsNoTracking() on run.StatusId equals status.Id
    //            where status.Code == "pending"
    //            orderby run.CreatedAt
    //            select new InsightGenerationRun(run.Id, run.UserId, status.Code))
    //           .ToListAsync(cancellationToken);
    #endregion

    public async Task<IReadOnlyList<Guid>> GetNightlyGenerationCandidatesAsync(CancellationToken cancellationToken) =>
        await (from s in db.Subscriptions.AsNoTracking()
               join plan in db.Plans.AsNoTracking() on s.PlanId equals plan.Id
               join status in db.SubscriptionStatuses.AsNoTracking() on s.StatusId equals status.Id
               join ps in db.PrivacySettings.AsNoTracking() on s.UserId equals ps.UserId
               where (status.Code == BillingConstants.ActiveStatusCode || status.Code == BillingConstants.TrialingStatusCode)
                     && (plan.Code == BillingConstants.BasicPlanCode || plan.Code == BillingConstants.ProPlanCode)
                     && ps.PersonalizedAIInsightsEnabled
               select s.UserId)
              .Distinct()
              .ToListAsync(cancellationToken);

    public async Task<bool> PersonalizedInsightsEnabledAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.PrivacySettings
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => x.PersonalizedAIInsightsEnabled)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<string> GetUserPlanCodeAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.UpdatedAt)
            .Join(db.Plans.AsNoTracking(), s => s.PlanId, p => p.Id, (_, p) => p.Code)
            .FirstOrDefaultAsync(cancellationToken) ?? BillingConstants.FreePlanCode;
}
