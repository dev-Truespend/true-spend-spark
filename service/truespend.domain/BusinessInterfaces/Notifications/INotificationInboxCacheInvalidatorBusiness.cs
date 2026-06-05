namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface INotificationInboxCacheInvalidatorBusiness
{
    Task InvalidateAsync(Guid userId, CancellationToken cancellationToken);
}
