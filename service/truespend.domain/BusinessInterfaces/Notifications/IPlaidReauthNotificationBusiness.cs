namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface IPlaidReauthNotificationBusiness
{
    Task<int> ProduceForStatusChangeAsync(
        int plaidItemId,
        Guid userId,
        string newStatusCode,
        string? lastError,
        string idempotencyKey,
        CancellationToken cancellationToken);
}
