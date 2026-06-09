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

        return await (from product in q
                      join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id
                      orderby issuer.DisplayName, product.DisplayName
                      select new CardProduct(
                          product.Id,
                          issuer.DisplayName,
                          product.DisplayName,
                          product.CardArtUrl,
                          product.AnnualFee,
                          product.RewardCurrencyName))
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
                                     cat.CategoryGroup,
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

    public async Task<IReadOnlyList<CatalogCardMatchCandidate>> GetCardMatchCandidatesAsync(
        string institutionName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(institutionName)) return Array.Empty<CatalogCardMatchCandidate>();

        // Pull all active products whose issuer's display_name shares any meaningful
        // token with the Plaid institution string. The ranking + final pick happens
        // in the matcher business class — this just narrows the candidate set.
        var tokens = Tokenize(institutionName);
        if (tokens.Length == 0) return Array.Empty<CatalogCardMatchCandidate>();

        var query = from product in db.CardProducts.AsNoTracking().Where(p => p.IsActive)
                    join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id
                    where issuer.IsActive
                    select new CatalogCardMatchCandidate(product.Id, issuer.DisplayName, product.DisplayName);

        var all = await query.ToListAsync(cancellationToken);
        return all.Where(c => SharesAnyToken(c.IssuerDisplayName, tokens)).ToList();
    }

    private static string[] Tokenize(string value) =>
        value.ToLowerInvariant()
            .Split(new[] { ' ', '-', '.', ',', '\'' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 3)
            .ToArray();

    private static bool SharesAnyToken(string candidateIssuer, string[] tokens)
    {
        var candidateLower = candidateIssuer.ToLowerInvariant();
        return tokens.Any(t => candidateLower.Contains(t));
    }
}
