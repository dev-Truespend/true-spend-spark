using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.App;
using TrueSpend.Domain.ServiceInterfaces.App;

namespace TrueSpend.Domain.Services.App;

public sealed class UserDailyUsageService(TrueSpendDbContext db) : IUserDailyUsageService
{
    public async Task<int> GetPlaidResyncCountAsync(Guid userId, DateOnly usageDate, CancellationToken cancellationToken) =>
        await db.UserDailyUsages
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.UsageDate == usageDate)
            .Select(x => x.PlaidResyncCount)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<int> IncrementPlaidResyncCountAsync(Guid userId, DateOnly usageDate, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var row = await db.UserDailyUsages.FirstOrDefaultAsync(x => x.UserId == userId && x.UsageDate == usageDate, cancellationToken);
        if (row is null)
        {
            row = new UserDailyUsageEntity
            {
                UserId = userId,
                UsageDate = usageDate,
                PlaidResyncCount = 1,
                CreatedAt = now,
                UpdatedAt = now,
            };
            db.UserDailyUsages.Add(row);
        }
        else
        {
            row.PlaidResyncCount++;
            row.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return row.PlaidResyncCount;
    }
}
