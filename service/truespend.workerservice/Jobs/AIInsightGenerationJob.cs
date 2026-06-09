using TrueSpend.Domain.BusinessInterfaces.AIInsights;

namespace TrueSpend.WorkerService.Jobs;

public sealed class AIInsightGenerationJob(IAIInsightsGenerationBusiness business)
{
    // MVP: nightly batch over all eligible Basic/Pro users (queue/on-demand path archived with messaging).
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.GenerateForAllEligibleUsersAsync(cancellationToken);
}
