using TrueSpend.Domain.Models.Analytics;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.DbContext;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Insights;

namespace TrueSpend.Domain.Services.Analytics;

public sealed class AnalyticsUpdateService(TrueSpendDbContext db) : IAnalyticsUpdateService
{
    public async Task UpsertSnapshotAsync(AnalyticsSnapshotUpsert snapshot, CancellationToken cancellationToken)
    {
        var existing = await db.AnalyticsSnapshots
            .Where(x => x.UserId == snapshot.UserId &&
                        x.PeriodId == snapshot.PeriodId &&
                        x.PeriodStart == snapshot.PeriodStart)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing is null)
        {
            db.AnalyticsSnapshots.Add(new AnalyticsSnapshotEntity
            {
                UserId = snapshot.UserId,
                PeriodId = snapshot.PeriodId,
                PeriodStart = snapshot.PeriodStart,
                PeriodEnd = snapshot.PeriodEnd,
                EarnedAmount = snapshot.EarnedAmount,
                EarnedCurrencyCode = snapshot.EarnedCurrencyCode,
                MissedAmount = snapshot.MissedAmount,
                PriorEarnedAmount = snapshot.PriorEarnedAmount,
                PriorMissedAmount = snapshot.PriorMissedAmount,
                DailyBreakdown = snapshot.DailyBreakdown,
                CategoryBreakdown = snapshot.CategoryBreakdown,
                ComputedAt = snapshot.ComputedAt,
                CreatedAt = snapshot.ComputedAt,
                UpdatedAt = snapshot.ComputedAt
            });
        }
        else
        {
            existing.EarnedAmount = snapshot.EarnedAmount;
            existing.MissedAmount = snapshot.MissedAmount;
            existing.EarnedCurrencyCode = snapshot.EarnedCurrencyCode;
            existing.PriorEarnedAmount = snapshot.PriorEarnedAmount;
            existing.PriorMissedAmount = snapshot.PriorMissedAmount;
            existing.DailyBreakdown = snapshot.DailyBreakdown;
            existing.CategoryBreakdown = snapshot.CategoryBreakdown;
            existing.ComputedAt = snapshot.ComputedAt;
            existing.UpdatedAt = snapshot.ComputedAt;
        }

        await db.SaveChangesAsync(cancellationToken);
    }
}
