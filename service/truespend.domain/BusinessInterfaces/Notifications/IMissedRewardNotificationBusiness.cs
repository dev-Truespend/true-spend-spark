namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface IMissedRewardNotificationBusiness
{
    Task<int> ProduceForMissedRewardEventAsync(int missedRewardEventId, CancellationToken cancellationToken);
}
