namespace TrueSpend.Domain.BusinessInterfaces.AIInsights;

public interface IAIInsightsGenerationBusiness
{
    // Nightly batch: create + process a generation run for every eligible Basic/Pro user.
    // This is the only generator in the MVP (generation is worker-only).
    Task GenerateForAllEligibleUsersAsync(CancellationToken cancellationToken);

    // Archived in MVP: nothing creates "pending" runs now (user-facing generate is archived).
    // Retained for future re-enable.
    // Task ProcessPendingRunsAsync(CancellationToken cancellationToken);
}
