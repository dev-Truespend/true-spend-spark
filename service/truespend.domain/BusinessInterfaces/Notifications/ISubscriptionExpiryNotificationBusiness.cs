namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface ISubscriptionExpiryNotificationBusiness
{
    // Produces trial/plan expiry reminders for subscriptions ending within `windowDays` (2),
    // firing one reminder per whole-day mark (2 days before, 1 day before). Returns the count produced.
    Task<int> ProduceExpiringAsync(DateTimeOffset now, int windowDays, CancellationToken cancellationToken);
}
