using TrueSpend.Domain.Models.Notifications;

namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface IAdminNotificationDispatchBusiness
{
    Task<AdminDispatchResult> DispatchDueCampaignsAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
