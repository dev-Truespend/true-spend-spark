using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class CatalogReadService(TrueSpendDbContext db) : ICatalogReadService
{
    public async Task<IReadOnlyList<Issuer>> GetIssuersAsync(CancellationToken cancellationToken) =>
        await db.CardIssuers.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayName)
            .Select(x => new Issuer(x.Id, x.DisplayName, x.LogoUrl))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<CardProduct>> GetProductsAsync(int? issuerId, string? query, CancellationToken cancellationToken)
    {
        var q = db.CardProducts.AsNoTracking().Where(x => x.IsActive);
        if (issuerId is int id) q = q.Where(x => x.IssuerId == id);
        if (!string.IsNullOrWhiteSpace(query))
        {
            var pattern = $"%{query.Trim()}%";
            q = q.Where(x => EF.Functions.ILike(x.DisplayName, pattern));
        }

        return await q.Join(
                db.CardIssuers.AsNoTracking(),
                product => product.IssuerId,
                issuer => issuer.Id,
                (product, issuer) => new CardProduct(
                    product.Id,
                    issuer.DisplayName,
                    product.DisplayName,
                    product.CardArtUrl,
                    product.AnnualFee,
                    product.RewardCurrencyName))
            .OrderBy(x => x.IssuerName)
            .ThenBy(x => x.DisplayName)
            .ToListAsync(cancellationToken);
    }

    public async Task<CardProductDetailResponse?> GetProductAsync(int cardProductId, CancellationToken cancellationToken)
    {
        var product = await (from p in db.CardProducts.AsNoTracking()
                             where p.Id == cardProductId && p.IsActive
                             join issuer in db.CardIssuers.AsNoTracking() on p.IssuerId equals issuer.Id
                             select new
                             {
                                 Product = new CardProduct(p.Id, issuer.DisplayName, p.DisplayName, p.CardArtUrl, p.AnnualFee, p.RewardCurrencyName),
                                 AnnualFee = (decimal?)p.AnnualFee
                             })
                           .FirstOrDefaultAsync(cancellationToken);

        if (product is null) return null;

        var rewardRules = await (from rule in db.RewardRules.AsNoTracking().Where(x => x.CardProductId == cardProductId)
                                 join cat in db.Categories.AsNoTracking() on rule.CategoryId equals cat.Id into catJoin
                                 from cat in catJoin.DefaultIfEmpty()
                                 select new RewardRule(
                                     cat.Code ?? "base",
                                     cat.DisplayName ?? "Base",
                                     rule.Multiplier,
                                     null,
                                     rule.Notes))
                                .ToListAsync(cancellationToken);

        var terms = new CardTerms(product.AnnualFee, null, null, null);

        return new CardProductDetailResponse(product.Product, rewardRules, terms);
    }

    public async Task<IReadOnlyList<Category>> GetCategoriesAsync(CancellationToken cancellationToken) =>
        await db.Categories.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.DisplayName)
            .Select(x => new Category(x.Id, x.Code, x.DisplayName, x.Icon))
            .ToListAsync(cancellationToken);

    public Task<string?> GetIssuerNameAsync(int issuerId, CancellationToken cancellationToken) =>
        db.CardIssuers.AsNoTracking()
            .Where(x => x.Id == issuerId)
            .Select(x => x.DisplayName)
            .FirstOrDefaultAsync(cancellationToken);
}
