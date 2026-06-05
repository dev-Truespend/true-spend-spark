namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface INotificationsProductionBusiness
{
    Task<int> FireDueRemindersAsync(CancellationToken cancellationToken);
}
