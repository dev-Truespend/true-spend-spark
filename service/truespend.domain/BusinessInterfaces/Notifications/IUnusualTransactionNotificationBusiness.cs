namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface IUnusualTransactionNotificationBusiness
{
    Task<int> ProduceForRecentTransactionsAsync(
        DateTimeOffset now,
        decimal thresholdAmount,
        TimeSpan lookback,
        CancellationToken cancellationToken);
}
