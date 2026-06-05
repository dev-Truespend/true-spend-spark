using TrueSpend.Domain.BusinessInterfaces.AIInsights;

namespace TrueSpend.WorkerService.Jobs;

public sealed class AIInsightGenerationJob(IAIInsightsGenerationBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.ProcessPendingRunsAsync(cancellationToken);
}
