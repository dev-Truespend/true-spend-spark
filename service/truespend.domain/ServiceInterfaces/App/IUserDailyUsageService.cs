namespace TrueSpend.Domain.ServiceInterfaces.App;

public interface IUserDailyUsageService
{
    Task<int> GetPlaidResyncCountAsync(Guid userId, DateOnly usageDate, CancellationToken cancellationToken);

    // Get-or-create today's row and increment the counter; returns the new count.
    Task<int> IncrementPlaidResyncCountAsync(Guid userId, DateOnly usageDate, DateTimeOffset now, CancellationToken cancellationToken);
}
