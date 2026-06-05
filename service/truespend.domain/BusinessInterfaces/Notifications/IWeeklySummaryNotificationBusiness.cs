namespace TrueSpend.Domain.BusinessInterfaces.Notifications;

public interface IWeeklySummaryNotificationBusiness
{
    Task<int> ProduceForCurrentHourAsync(
        DateTimeOffset now,
        DayOfWeek fireDay,
        int fireHour,
        CancellationToken cancellationToken);
}
