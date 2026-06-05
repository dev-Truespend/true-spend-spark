namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface IPlaidNewAccountsNotificationBusiness
{
    Task<int> ProduceForNewAccountsAsync(
        int plaidItemId,
        Guid userId,
        string idempotencyKey,
        CancellationToken cancellationToken);
}
