using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.WorkerService.Config;

namespace TrueSpend.WorkerService.Jobs;

public sealed class UnusualTransactionJob(
    IUnusualTransactionNotificationBusiness business,
    IOptionsMonitor<WorkerConfig> options)
{
    public Task RunAsync(CancellationToken cancellationToken)
    {
        var cfg = options.CurrentValue.UnusualTransaction;
        return business.ProduceForRecentTransactionsAsync(
            DateTimeOffset.UtcNow,
            cfg.ThresholdAmount,
            TimeSpan.FromMinutes(cfg.LookbackMinutes),
            cancellationToken);
    }
}
