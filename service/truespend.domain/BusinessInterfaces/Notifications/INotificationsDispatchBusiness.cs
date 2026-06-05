namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface INotificationsDispatchBusiness
{
    Task<int> DispatchPushAsync(int notificationId, CancellationToken cancellationToken);
}
