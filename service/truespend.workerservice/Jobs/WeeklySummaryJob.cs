using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.WorkerService.Config;

namespace TrueSpend.WorkerService.Jobs;

public sealed class WeeklySummaryJob(
    IWeeklySummaryNotificationBusiness business,
    IOptionsMonitor<WorkerConfig> options)
{
    public Task RunAsync(CancellationToken cancellationToken)
    {
        var cfg = options.CurrentValue.WeeklySummary;
        return business.ProduceForCurrentHourAsync(
            DateTimeOffset.UtcNow,
            (DayOfWeek)cfg.FireDay,
            cfg.FireHour,
            cancellationToken);
    }
}
