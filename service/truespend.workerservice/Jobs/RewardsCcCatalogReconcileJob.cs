using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.WorkerService.Config;

namespace TrueSpend.WorkerService.Jobs;

public sealed class RewardsCcCatalogReconcileJob(
    IRewardsCcCatalogReconcileBusiness business,
    IOptionsMonitor<WorkerConfig> options)
{
    public Task RunAsync(CancellationToken cancellationToken)
    {
        var cfg = options.CurrentValue.RewardsCcCatalogReconcile;
        return business.ReconcileAsync(cfg.DryRun, DateTimeOffset.UtcNow, cancellationToken);
    }
}
