using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.Models.Analytics;
using TrueSpend.Domain.ServiceInterfaces.Analytics;

namespace TrueSpend.Domain.Business.Analytics;

public sealed class AnalyticsComputeBusiness(
    IAnalyticsReadService readService,
    IAnalyticsUpdateService updateService) : IAnalyticsComputeBusiness
{
    public async Task RecomputeSnapshotsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var periods = await readService.GetAllPeriodsAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;

        foreach (var (code, periodId, periodStart, periodEnd, priorStart, priorEnd) in periods)
        {
            var data = await readService.ComputeSnapshotDataAsync(userId, periodStart, periodEnd, cancellationToken);
            var prior = await readService.GetPeriodTotalsAsync(userId, priorStart, priorEnd, cancellationToken);

            var upsert = new AnalyticsSnapshotUpsert(
                userId,
                periodId,
                periodStart,
                periodEnd,
                data.EarnedAmount,
                data.EarnedCurrencyCode,
                data.MissedAmount,
                prior.Earned,
                prior.Missed,
                data.DailyBreakdownJson,
                data.CategoryBreakdownJson,
                now);

            await updateService.UpsertSnapshotAsync(upsert, cancellationToken);
        }
    }
}
