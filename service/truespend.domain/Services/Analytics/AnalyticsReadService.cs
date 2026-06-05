using TrueSpend.Domain.Models.Analytics;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.DbContext;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Analytics;

public sealed class AnalyticsReadService(TrueSpendDbContext db) : IAnalyticsReadService
{
    public async Task<AnalyticsSnapshot?> GetSnapshotAsync(Guid userId, string periodCode, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = ComputePeriodStart(periodCode, today);

        return await db.AnalyticsSnapshots
            .AsNoTracking()
            .Where(x => x.UserId == userId && x.PeriodStart == periodStart)
            .Join(db.AnalyticsPeriods.AsNoTracking().Where(p => p.Code == periodCode),
                  s => s.PeriodId,
                  p => p.Id,
                  (s, _) => s)
            .Select(s => new AnalyticsSnapshot(
                s.PeriodStart,
                s.PeriodEnd,
                s.EarnedAmount,
                s.EarnedCurrencyCode,
                s.MissedAmount,
                s.PriorEarnedAmount,
                s.PriorMissedAmount,
                s.DailyBreakdown,
                s.CategoryBreakdown))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MissedRewardSummary>> GetTopMissedRewardsAsync(
        Guid userId, DateOnly periodStart, DateOnly periodEnd, int limit, CancellationToken cancellationToken)
    {
        return await (from m in db.MissedRewardEvents.AsNoTracking()
                          .Where(x => !x.IsDismissed)
                      join t in db.Transactions.AsNoTracking()
                          .Where(x => x.UserId == userId && x.TransactionDate >= periodStart && x.TransactionDate <= periodEnd)
                          on m.TransactionId equals t.Id
                      join ac in db.UserCards.AsNoTracking() on t.UserCardId equals ac.Id into acJoin
                      from actualCard in acJoin.DefaultIfEmpty()
                      join bc in db.UserCards.AsNoTracking() on m.BetterUserCardId equals bc.Id into bcJoin
                      from betterCard in bcJoin.DefaultIfEmpty()
                      join actualProduct in db.CardProducts.AsNoTracking() on actualCard.CardProductId equals actualProduct.Id into apJoin
                      from actualProduct in apJoin.DefaultIfEmpty()
                      join betterProduct in db.CardProducts.AsNoTracking() on betterCard.CardProductId equals betterProduct.Id into bpJoin
                      from betterProduct in bpJoin.DefaultIfEmpty()
                      orderby m.MissedAmount descending
                      select new MissedRewardSummary(
                          m.Id,
                          t.Id,
                          t.Description ?? t.LocationLabel ?? "Transaction",
                          actualCard.Nickname ?? actualProduct.DisplayName ?? actualCard.CustomCardName,
                          betterCard.Nickname ?? betterProduct.DisplayName ?? betterCard.CustomCardName,
                          m.ActualRewardAmount,
                          m.PotentialRewardAmount,
                          m.MissedAmount,
                          m.IsDismissed))
                     .Take(limit)
                     .ToListAsync(cancellationToken);
    }

    public async Task<bool> PeriodExistsAsync(string periodCode, CancellationToken cancellationToken) =>
        await db.AnalyticsPeriods.AsNoTracking().AnyAsync(x => x.Code == periodCode, cancellationToken);

    public async Task<IReadOnlyList<(string Code, short Id, DateOnly PeriodStart, DateOnly PeriodEnd, DateOnly PriorStart, DateOnly PriorEnd)>> GetAllPeriodsAsync(
        CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periods = await db.AnalyticsPeriods
            .AsNoTracking()
            .Select(p => new { p.Code, p.Id })
            .ToListAsync(cancellationToken);

        return periods
            .Select(p =>
            {
                var start = ComputePeriodStart(p.Code, today);
                var end = ComputePeriodEnd(p.Code, today);
                var priorStart = ComputePriorPeriodStart(p.Code, start);
                var priorEnd = start.AddDays(-1);
                return (p.Code, p.Id, start, end, priorStart, priorEnd);
            })
            .ToList();
    }

    public async Task<(decimal Earned, decimal Missed)> GetPeriodTotalsAsync(
        Guid userId, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var earned = await (from t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId &&
                                            x.TransactionDate >= periodStart &&
                                            x.TransactionDate <= periodEnd)
                            join r in db.TransactionRewardResults.AsNoTracking() on t.Id equals r.TransactionId
                            select r.EarnedAmount).SumAsync(cancellationToken);

        var missed = await (from m in db.MissedRewardEvents.AsNoTracking()
                            join t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId &&
                                            x.TransactionDate >= periodStart &&
                                            x.TransactionDate <= periodEnd)
                                on m.TransactionId equals t.Id
                            where !m.IsDismissed
                            select m.MissedAmount).SumAsync(cancellationToken);

        return (earned, missed);
    }

    public async Task<AnalyticsSnapshotData> ComputeSnapshotDataAsync(
        Guid userId, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        var earnedRows = await (from t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId &&
                                            x.TransactionDate >= periodStart &&
                                            x.TransactionDate <= periodEnd)
                                join r in db.TransactionRewardResults.AsNoTracking() on t.Id equals r.TransactionId
                                join c in db.Categories.AsNoTracking() on t.CategoryId equals c.Id into cj
                                from c in cj.DefaultIfEmpty()
                                select new
                                {
                                    t.TransactionDate,
                                    r.EarnedAmount,
                                    CategoryCode = c != null ? c.Code : null,
                                    CategoryName = c != null ? c.DisplayName : null
                                }).ToListAsync(cancellationToken);

        var missedRows = await (from m in db.MissedRewardEvents.AsNoTracking()
                                join t in db.Transactions.AsNoTracking()
                                    .Where(x => x.UserId == userId &&
                                                x.TransactionDate >= periodStart &&
                                                x.TransactionDate <= periodEnd)
                                    on m.TransactionId equals t.Id
                                join c in db.Categories.AsNoTracking() on t.CategoryId equals c.Id into cj
                                from c in cj.DefaultIfEmpty()
                                where !m.IsDismissed
                                select new
                                {
                                    t.TransactionDate,
                                    m.MissedAmount,
                                    CategoryCode = c != null ? c.Code : null,
                                    CategoryName = c != null ? c.DisplayName : null
                                }).ToListAsync(cancellationToken);

        var earnedTotal = earnedRows.Sum(x => x.EarnedAmount);
        var missedTotal = missedRows.Sum(x => x.MissedAmount);

        var missedByDay = missedRows
            .GroupBy(x => x.TransactionDate)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.MissedAmount));

        var earnedDays = earnedRows.Select(x => x.TransactionDate).Distinct();
        var allDays = earnedDays.Concat(missedByDay.Keys).Distinct().OrderBy(d => d);

        var earnedByDay = earnedRows
            .GroupBy(x => x.TransactionDate)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.EarnedAmount));

        var dailyBreakdown = allDays
            .Select(d => new RewardBreakdownItem(
                d.ToString("yyyy-MM-dd"),
                d.ToString("MMM d"),
                earnedByDay.GetValueOrDefault(d),
                missedByDay.GetValueOrDefault(d)))
            .ToList();

        var earnedByCategory = earnedRows
            .Where(x => x.CategoryCode is not null)
            .GroupBy(x => new { x.CategoryCode, x.CategoryName })
            .ToDictionary(g => g.Key.CategoryCode!, g => (Earned: g.Sum(x => x.EarnedAmount), Name: g.Key.CategoryName ?? g.Key.CategoryCode!));

        var missedByCategory = missedRows
            .Where(x => x.CategoryCode is not null)
            .GroupBy(x => new { x.CategoryCode, x.CategoryName })
            .ToDictionary(g => g.Key.CategoryCode!, g => (Missed: g.Sum(x => x.MissedAmount), Name: g.Key.CategoryName ?? g.Key.CategoryCode!));

        var categoryKeys = earnedByCategory.Keys.Concat(missedByCategory.Keys).Distinct();
        var categoryBreakdown = categoryKeys
            .Select(code =>
            {
                var earned = earnedByCategory.TryGetValue(code, out var e) ? e.Earned : 0m;
                var missed = missedByCategory.TryGetValue(code, out var m) ? m.Missed : 0m;
                var name = earnedByCategory.TryGetValue(code, out var en) ? en.Name :
                           missedByCategory.TryGetValue(code, out var mn) ? mn.Name : code;
                return new RewardBreakdownItem(code, name, earned, missed);
            })
            .OrderByDescending(x => x.Earned + x.Missed)
            .ToList();

        var dailyJson = JsonSerializer.Serialize(dailyBreakdown);
        var categoryJson = JsonSerializer.Serialize(categoryBreakdown);

        return new AnalyticsSnapshotData(earnedTotal, missedTotal, "cash_back", dailyJson, categoryJson);
    }

    private static DateOnly ComputePeriodStart(string periodCode, DateOnly today) => periodCode switch
    {
        "week"    => today.AddDays(-(int)today.DayOfWeek),
        "month"   => new DateOnly(today.Year, today.Month, 1),
        "quarter" => new DateOnly(today.Year, ((today.Month - 1) / 3) * 3 + 1, 1),
        "year"    => new DateOnly(today.Year, 1, 1),
        _         => new DateOnly(today.Year, today.Month, 1)
    };

    private static DateOnly ComputePeriodEnd(string periodCode, DateOnly today) => periodCode switch
    {
        "week"    => today.AddDays(6 - (int)today.DayOfWeek),
        "month"   => new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month)),
        "quarter" => ComputeQuarterEnd(today),
        "year"    => new DateOnly(today.Year, 12, 31),
        _         => new DateOnly(today.Year, today.Month, DateTime.DaysInMonth(today.Year, today.Month))
    };

    private static DateOnly ComputeQuarterEnd(DateOnly today)
    {
        var lastMonth = ((today.Month - 1) / 3) * 3 + 3;
        return new DateOnly(today.Year, lastMonth, DateTime.DaysInMonth(today.Year, lastMonth));
    }

    private static DateOnly ComputePriorPeriodStart(string periodCode, DateOnly currentStart) => periodCode switch
    {
        "week"    => currentStart.AddDays(-7),
        "month"   => currentStart.AddMonths(-1),
        "quarter" => currentStart.AddMonths(-3),
        "year"    => currentStart.AddYears(-1),
        _         => currentStart.AddMonths(-1)
    };
}
