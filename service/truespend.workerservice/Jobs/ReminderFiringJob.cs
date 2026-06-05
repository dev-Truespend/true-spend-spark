using TrueSpend.Domain.BusinessInterfaces.Notifications;

namespace TrueSpend.WorkerService.Jobs;

public sealed class ReminderFiringJob(INotificationsProductionBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.FireDueRemindersAsync(cancellationToken);
}
