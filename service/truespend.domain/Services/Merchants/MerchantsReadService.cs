using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
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
}
