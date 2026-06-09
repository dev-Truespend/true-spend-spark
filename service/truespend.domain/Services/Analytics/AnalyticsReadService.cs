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
                      where actualCard != null && actualCard.IsActive
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
        // Exclude transactions whose user_card was soft-deleted; keeps period totals in sync with the
        // (filtered) transactions list and missed-rewards list.
        var earned = await (from t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId &&
                                            x.TransactionDate >= periodStart &&
                                            x.TransactionDate <= periodEnd)
                            join c in db.UserCards.AsNoTracking() on t.UserCardId equals c.Id
                            where c.IsActive
                            join r in db.TransactionRewardResults.AsNoTracking() on t.Id equals r.TransactionId
                            select r.EarnedAmount).SumAsync(cancellationToken);

        var missed = await (from m in db.MissedRewardEvents.AsNoTracking()
                            join t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId &&
                                            x.TransactionDate >= periodStart &&
                                            x.TransactionDate <= periodEnd)
                                on m.TransactionId equals t.Id
                            join c in db.UserCards.AsNoTracking() on t.UserCardId equals c.Id
                            where c.IsActive && !m.IsDismissed
                            select m.MissedAmount).SumAsync(cancellationToken);

        return (earned, missed);
    }

    public async Task<AnalyticsSnapshotData> ComputeSnapshotDataAsync(
        Guid userId, DateOnly periodStart, DateOnly periodEnd, CancellationToken cancellationToken)
    {
        // Exclude transactions whose user_card was soft-deleted from snapshot computation.
        // Bucket the category breakdown on the Plaid PRIMARY category (transaction_category_id),
        // not the bridged catalog category_id: the Plaid taxonomy is populated on every synced
        // transaction, so the donut stays complete even where the reward bridge has no mapping.
        var earnedRows = await (from t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId &&
                                            x.TransactionDate >= periodStart &&
                                            x.TransactionDate <= periodEnd)
                                join uc in db.UserCards.AsNoTracking() on t.UserCardId equals uc.Id
                                where uc.IsActive
                                join r in db.TransactionRewardResults.AsNoTracking() on t.Id equals r.TransactionId
                                select new
                                {
                                    t.TransactionDate,
                                    r.EarnedAmount,
                                    t.TransactionCategoryId
                                }).ToListAsync(cancellationToken);

        var missedRows = await (from m in db.MissedRewardEvents.AsNoTracking()
                                join t in db.Transactions.AsNoTracking()
                                    .Where(x => x.UserId == userId &&
                                                x.TransactionDate >= periodStart &&
                                                x.TransactionDate <= periodEnd)
                                    on m.TransactionId equals t.Id
                                join uc in db.UserCards.AsNoTracking() on t.UserCardId equals uc.Id
                                where uc.IsActive && !m.IsDismissed
                                select new
                                {
                                    t.TransactionDate,
                                    m.MissedAmount,
                                    t.TransactionCategoryId
                                }).ToListAsync(cancellationToken);

        // Plaid taxonomy is tiny (~120 rows) — load once and resolve each leaf to its primary in memory.
        var txCategories = await db.TransactionCategories.AsNoTracking()
            .Select(c => new { c.Id, c.Code, c.DisplayName, c.ParentId, c.IsPrimary })
            .ToListAsync(cancellationToken);
        var txCatById = txCategories.ToDictionary(c => c.Id);

        (string? Code, string? Name) ResolvePrimary(short? txCatId)
        {
            if (txCatId is null || !txCatById.TryGetValue(txCatId.Value, out var c)) return (null, null);
            if (!c.IsPrimary && c.ParentId is not null && txCatById.TryGetValue(c.ParentId.Value, out var p))
                return (p.Code, p.DisplayName);
            return (c.Code, c.DisplayName);
        }

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
            .Select(x => new { Primary = ResolvePrimary(x.TransactionCategoryId), x.EarnedAmount })
            .Where(x => x.Primary.Code is not null)
            .GroupBy(x => new { x.Primary.Code, x.Primary.Name })
            .ToDictionary(g => g.Key.Code!, g => (Earned: g.Sum(x => x.EarnedAmount), Name: g.Key.Name ?? g.Key.Code!));

        var missedByCategory = missedRows
            .Select(x => new { Primary = ResolvePrimary(x.TransactionCategoryId), x.MissedAmount })
            .Where(x => x.Primary.Code is not null)
            .GroupBy(x => new { x.Primary.Code, x.Primary.Name })
            .ToDictionary(g => g.Key.Code!, g => (Missed: g.Sum(x => x.MissedAmount), Name: g.Key.Name ?? g.Key.Code!));

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
