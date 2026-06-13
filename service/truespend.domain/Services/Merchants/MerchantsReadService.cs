using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;

namespace TrueSpend.Domain.Services.Merchants;

public sealed class MerchantsReadService(TrueSpendDbContext db) : IMerchantsReadService
{
    public Task<Merchant?> GetMerchantAsync(int merchantId, CancellationToken cancellationToken) =>
        (from merchant in db.Merchants.AsNoTracking().Where(x => x.Id == merchantId)
         join category in db.Categories.AsNoTracking() on merchant.CategoryId equals category.Id into categoryJoin
         from category in categoryJoin.DefaultIfEmpty()
         select new Merchant(
             merchant.Id,
             merchant.CanonicalName,
             category.Code ?? "general",
             merchant.IsMultiCategory,
             merchant.Address))
        .FirstOrDefaultAsync(cancellationToken);

    public Task<Merchant?> FindByNameAsync(string name, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return (from merchant in db.Merchants.AsNoTracking().Where(x => x.NormalizedName == normalized)
                join category in db.Categories.AsNoTracking() on merchant.CategoryId equals category.Id into categoryJoin
                from category in categoryJoin.DefaultIfEmpty()
                select new Merchant(
                    merchant.Id,
                    merchant.CanonicalName,
                    category.Code ?? "general",
                    merchant.IsMultiCategory,
                    merchant.Address))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<MerchantCategoryMatch> ResolveCategoryAsync(string merchantName, CancellationToken cancellationToken)
    {
        var normalized = merchantName.Trim().ToLowerInvariant();
        if (normalized.Length == 0)
        {
            return new MerchantCategoryMatch("general", false);
        }

        var matches = await (from alias in db.CategoryAliases.AsNoTracking()
                             join category in db.Categories.AsNoTracking() on alias.CategoryId equals category.Id
                             where category.IsActive && EF.Functions.ILike(normalized, "%" + alias.Alias + "%")
                             select new { category.Code, AliasLength = alias.Alias.Length })
                            .ToListAsync(cancellationToken);

        if (matches.Count == 0)
        {
            return new MerchantCategoryMatch("general", false);
        }

        var distinctCategories = matches.Select(m => m.Code).Distinct().ToList();
        var primary = matches
            .GroupBy(m => m.Code)
            .OrderByDescending(g => g.Max(x => x.AliasLength))
            .First()
            .Key;

        return new MerchantCategoryMatch(primary, distinctCategories.Count > 1);
    }

    // Powers the home "last-visited replay" surface. We honor the category the
    // user explicitly chose during the visit (`SelectedCategoryId`) over the
    // merchant's default so a Walmart visit that the user marked "grocery"
    // replays as grocery, not the merchant's nominal category.
    public Task<RecentMerchantVisit?> GetMostRecentVisitAsync(OnboardingWorkflowUser user, TimeSpan lookback, CancellationToken cancellationToken)
    {
        var since = DateTimeOffset.UtcNow - lookback;
        return (from visit in db.MerchantVisits.AsNoTracking()
                where visit.UserId == user.UserId && visit.VisitedAt >= since
                orderby visit.VisitedAt descending
                join merchant in db.Merchants.AsNoTracking() on visit.MerchantId equals merchant.Id
                join merchantCategory in db.Categories.AsNoTracking() on merchant.CategoryId equals merchantCategory.Id into merchantCategoryJoin
                from merchantCategory in merchantCategoryJoin.DefaultIfEmpty()
                join selectedCategory in db.Categories.AsNoTracking() on visit.SelectedCategoryId equals selectedCategory.Id into selectedCategoryJoin
                from selectedCategory in selectedCategoryJoin.DefaultIfEmpty()
                select new RecentMerchantVisit(
                    new Merchant(
                        merchant.Id,
                        merchant.CanonicalName,
                        merchantCategory.Code ?? "general",
                        merchant.IsMultiCategory,
                        merchant.Address),
                    selectedCategory.Code ?? merchantCategory.Code ?? "general",
                    visit.VisitedAt))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<RecentMerchantVisit>> GetRecentVisitsAsync(OnboardingWorkflowUser user, TimeSpan lookback, int limit, CancellationToken cancellationToken)
    {
        var since = DateTimeOffset.UtcNow - lookback;
        return await (from visit in db.MerchantVisits.AsNoTracking()
                where visit.UserId == user.UserId && visit.VisitedAt >= since
                orderby visit.VisitedAt descending
                join merchant in db.Merchants.AsNoTracking() on visit.MerchantId equals merchant.Id
                join merchantCategory in db.Categories.AsNoTracking() on merchant.CategoryId equals merchantCategory.Id into merchantCategoryJoin
                from merchantCategory in merchantCategoryJoin.DefaultIfEmpty()
                join selectedCategory in db.Categories.AsNoTracking() on visit.SelectedCategoryId equals selectedCategory.Id into selectedCategoryJoin
                from selectedCategory in selectedCategoryJoin.DefaultIfEmpty()
                select new RecentMerchantVisit(
                    new Merchant(
                        merchant.Id,
                        merchant.CanonicalName,
                        merchantCategory.Code ?? "general",
                        merchant.IsMultiCategory,
                        merchant.Address),
                    selectedCategory.Code ?? merchantCategory.Code ?? "general",
                    visit.VisitedAt))
            .Take(limit)
            .ToListAsync(cancellationToken);
    }
}
