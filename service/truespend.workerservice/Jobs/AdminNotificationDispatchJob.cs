using TrueSpend.Domain.BusinessInterfaces.Notifications;

namespace TrueSpend.WorkerService.Jobs;

public sealed class AdminNotificationDispatchJob(IAdminNotificationDispatchBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.DispatchDueCampaignsAsync(DateTimeOffset.UtcNow, cancellationToken);
}
