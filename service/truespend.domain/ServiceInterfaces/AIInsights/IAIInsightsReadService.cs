using TrueSpend.Domain.Models.AIInsights;

namespace TrueSpend.Domain.ServiceInterfaces.AIInsights;

public interface IAIInsightsReadService
{
    Task<IReadOnlyList<AIInsight>> GetActiveInsightsAsync(Guid userId, CancellationToken cancellationToken);
    Task<InsightGenerationRun?> GetRunAsync(int runId, CancellationToken cancellationToken);

    // Archived in MVP: pending-runs draining is disabled (generation is worker-only and self-contained).
    // Retained for future re-enable.
    // Task<IReadOnlyList<InsightGenerationRun>> GetPendingRunsAsync(CancellationToken cancellationToken);

    // Distinct user ids eligible for the nightly batch: active/trialing Basic or Pro subscription
    // AND personalized AI insights enabled in privacy settings. Entitlement is re-checked per user
    // by the generation business before a run is created.
    Task<IReadOnlyList<Guid>> GetNightlyGenerationCandidatesAsync(CancellationToken cancellationToken);

    Task<bool> PersonalizedInsightsEnabledAsync(Guid userId, CancellationToken cancellationToken);
    Task<string> GetUserPlanCodeAsync(Guid userId, CancellationToken cancellationToken);
}
