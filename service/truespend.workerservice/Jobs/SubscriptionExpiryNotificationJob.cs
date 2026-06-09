using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.WorkerService.Config;

namespace TrueSpend.WorkerService.Jobs;

public sealed class SubscriptionExpiryNotificationJob(
    ISubscriptionExpiryNotificationBusiness business,
    IOptionsMonitor<WorkerConfig> options)
{
    public Task RunAsync(CancellationToken cancellationToken)
    {
        var cfg = options.CurrentValue.SubscriptionExpiry;
        return business.ProduceExpiringAsync(DateTimeOffset.UtcNow, cfg.WindowDays, cancellationToken);
    }
}
