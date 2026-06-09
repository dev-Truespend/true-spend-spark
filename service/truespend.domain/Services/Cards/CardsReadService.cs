using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Cards;

public sealed class CardsReadService(TrueSpendDbContext db) : ICardsReadService
{
    public async Task<IReadOnlyList<CardSummary>> GetCardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        return await (from card in db.UserCards.AsNoTracking().Where(x => x.UserId == user.UserId && x.IsActive)
                      join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
                      from product in productJoin.DefaultIfEmpty()
                      join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
                      from issuer in issuerJoin.DefaultIfEmpty()
                      join source in db.CardSources.AsNoTracking() on card.SourceId equals source.Id into sourceJoin
                      from source in sourceJoin.DefaultIfEmpty()
                      select new CardSummary(
                          card.Id,
                          card.Nickname ?? product.DisplayName ?? card.CustomCardName ?? "Card",
                          issuer.DisplayName ?? card.CustomIssuerName ?? "Unknown issuer",
                          card.LastFour,
                          source.Code ?? "manual",
                          card.IsPrimary,
                          card.SyncStatus,
                          product.CardArtUrl))
                     .ToListAsync(cancellationToken);
    }

    public async Task<CardDetailResponse?> GetCardDetailAsync(OnboardingWorkflowUser user, int cardId, CancellationToken cancellationToken)
    {
        var card = await (from c in db.UserCards.AsNoTracking().Where(x => x.UserId == user.UserId && x.Id == cardId && x.IsActive)
                          join product in db.CardProducts.AsNoTracking() on c.CardProductId equals product.Id into productJoin
                          from product in productJoin.DefaultIfEmpty()
                          join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
                          from issuer in issuerJoin.DefaultIfEmpty()
                          join source in db.CardSources.AsNoTracking() on c.SourceId equals source.Id into sourceJoin
                          from source in sourceJoin.DefaultIfEmpty()
                          join rc in db.RewardCurrencies.AsNoTracking() on product.RewardCurrencyId equals rc.Id into rcJoin
                          from rc in rcJoin.DefaultIfEmpty()
                          select new
                          {
                              Summary = new CardSummary(
                                  c.Id,
                                  c.Nickname ?? product.DisplayName ?? c.CustomCardName ?? "Card",
                                  issuer.DisplayName ?? c.CustomIssuerName ?? "Unknown issuer",
                                  c.LastFour,
                                  source.Code ?? "manual",
                                  c.IsPrimary,
                                  c.SyncStatus,
                                  product.CardArtUrl),
                              ProductId = c.CardProductId,
                              AnnualFee = (decimal?)product.AnnualFee,
                              PurchaseApr = product.PurchaseApr,
                              ForeignTransactionFee = product.ForeignTransactionFee,
                              TermsSummary = product.TermsSummary,
                              RewardCurrencyCode = rc.Code
                          })
                         .FirstOrDefaultAsync(cancellationToken);

        if (card is null) return null;

        var rewardRules = card.ProductId.HasValue
            ? await GetRewardRulesForProductAsync(card.ProductId.Value, cancellationToken)
            : [];

        var terms = new CardTerms(card.AnnualFee, card.PurchaseApr, card.ForeignTransactionFee, card.TermsSummary);

        var monthly = await ComputeMonthlyRewardContributionAsync(user.UserId, cardId, card.RewardCurrencyCode, cancellationToken);

        return new CardDetailResponse(card.Summary, rewardRules, monthly, terms);
    }

    private async Task<MonthlyRewardContribution?> ComputeMonthlyRewardContributionAsync(
        Guid userId, int cardId, string? rewardCurrencyCode, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var periodStart = new DateOnly(today.Year, today.Month, 1);

        var totals = await (from t in db.Transactions.AsNoTracking()
                                .Where(x => x.UserId == userId && x.UserCardId == cardId && x.TransactionDate >= periodStart && x.TransactionDate <= today)
                            join r in db.TransactionRewardResults.AsNoTracking() on t.Id equals r.TransactionId
                            select r.EarnedAmount).SumAsync(cancellationToken);

        if (totals == 0m) return null;

        var currencyCode = rewardCurrencyCode ?? "cash_back";
        var estimatedValue = currencyCode is "USD" or "GBP" or "EUR" or "cash_back" ? totals : totals * 0.01m;
        var label = today.ToString("MMMM yyyy");
        return new MonthlyRewardContribution(totals, estimatedValue, currencyCode, label);
    }

    public async Task<RewardOverridesResponse> GetRewardOverridesAsync(int cardId, CancellationToken cancellationToken)
    {
        var overrides = await (from o in db.CardRewardOverrides.AsNoTracking().Where(x => x.UserCardId == cardId)
                               join cat in db.Categories.AsNoTracking() on o.CategoryId equals cat.Id into catJoin
                               from cat in catJoin.DefaultIfEmpty()
                               select new RewardOverride(
                                   cat.Code ?? "base",
                                   cat.DisplayName ?? "Base",
                                   o.Multiplier,
                                   o.Notes))
                              .ToListAsync(cancellationToken);

        return new RewardOverridesResponse(overrides);
    }

    public Task<int> CountActiveUserCardsBySourceAsync(OnboardingWorkflowUser user, string cardSource, CancellationToken cancellationToken) =>
        (from card in db.UserCards.AsNoTracking().Where(x => x.UserId == user.UserId && x.IsActive)
         join source in db.CardSources.AsNoTracking() on card.SourceId equals source.Id
         where source.Code == cardSource
         select card.Id)
        .CountAsync(cancellationToken);

    public async Task<IReadOnlyList<AdoptableManualCard>> FindAdoptableManualCardsAsync(Guid userId, string? mask, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(mask)) return [];

        return await (
            from card in db.UserCards.AsNoTracking()
                .Where(x => x.UserId == userId && x.IsActive && x.PlaidAccountId == null && x.LastFour == mask)
            join source in db.CardSources.AsNoTracking() on card.SourceId equals source.Id
            where source.Code == "manual"
            join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
            from product in productJoin.DefaultIfEmpty()
            join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
            from issuer in issuerJoin.DefaultIfEmpty()
            select new AdoptableManualCard(
                card.Id,
                card.CardProductId,
                issuer != null ? issuer.DisplayName : card.CustomIssuerName,
                card.IsPrimary,
                card.CreatedAt))
            .ToListAsync(cancellationToken);
    }

    // Powers the home portfolio block — one DB round-trip for cards + their reward
    // rules + category metadata. Ordering: primary card first, then by date added.
    // Cards with no catalog product (manual cards) or with no rules surface a synthetic
    // "everywhere 1×" entry so the mobile renders consistently across both paths.
    public async Task<IReadOnlyList<PortfolioCard>> GetPortfolioAsync(OnboardingWorkflowUser user, int topCategoriesPerCard, CancellationToken cancellationToken)
    {
        var cards = await (from card in db.UserCards.AsNoTracking().Where(x => x.UserId == user.UserId && x.IsActive)
                           join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
                           from product in productJoin.DefaultIfEmpty()
                           join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
                           from issuer in issuerJoin.DefaultIfEmpty()
                           join source in db.CardSources.AsNoTracking() on card.SourceId equals source.Id into sourceJoin
                           from source in sourceJoin.DefaultIfEmpty()
                           orderby card.IsPrimary descending, card.CreatedAt ascending
                           select new
                           {
                               Summary = new CardSummary(
                                   card.Id,
                                   card.Nickname ?? product.DisplayName ?? card.CustomCardName ?? "Card",
                                   issuer.DisplayName ?? card.CustomIssuerName ?? "Unknown issuer",
                                   card.LastFour,
                                   source.Code ?? "manual",
                                   card.IsPrimary,
                                   card.SyncStatus,
                                   product.CardArtUrl),
                               ProductId = (int?)card.CardProductId
                           }).ToListAsync(cancellationToken);

        if (cards.Count == 0) return Array.Empty<PortfolioCard>();

        var productIds = cards.Where(c => c.ProductId.HasValue).Select(c => c.ProductId!.Value).Distinct().ToArray();
        var rulesByProduct = productIds.Length == 0
            ? new Dictionary<int, List<PortfolioCategory>>()
            : (await (from rule in db.RewardRules.AsNoTracking().Where(x => productIds.Contains(x.CardProductId))
                      join cat in db.Categories.AsNoTracking() on rule.CategoryId equals cat.Id into catJoin
                      from cat in catJoin.DefaultIfEmpty()
                      select new
                      {
                          rule.CardProductId,
                          CategoryCode = cat.Code ?? "base",
                          CategoryName = cat.DisplayName ?? "Base",
                          rule.Multiplier
                      }).ToListAsync(cancellationToken))
                .GroupBy(r => r.CardProductId)
                .ToDictionary(
                    g => g.Key,
                    g => g.OrderByDescending(r => r.Multiplier)
                          .Take(topCategoriesPerCard)
                          .Select(r => new PortfolioCategory(r.CategoryCode, r.CategoryName, r.Multiplier))
                          .ToList());

        var baseCategory = new PortfolioCategory("base", "Everywhere", 1m);

        return cards
            .Select(c =>
            {
                var rules = c.ProductId.HasValue && rulesByProduct.TryGetValue(c.ProductId.Value, out var list) && list.Count > 0
                    ? list
                    : new List<PortfolioCategory> { baseCategory };
                return new PortfolioCard(c.Summary, rules);
            })
            .ToList();
    }

    private async Task<IReadOnlyList<RewardRule>> GetRewardRulesForProductAsync(int productId, CancellationToken cancellationToken)
    {
        var rows = await (from rule in db.RewardRules.AsNoTracking().Where(x => x.CardProductId == productId)
                          join cat in db.Categories.AsNoTracking() on rule.CategoryId equals cat.Id into catJoin
                          from cat in catJoin.DefaultIfEmpty()
                          join cp in db.CapPeriods.AsNoTracking() on rule.CapPeriodId equals cp.Id into cpJoin
                          from cp in cpJoin.DefaultIfEmpty()
                          select new
                          {
                              CategoryCode = cat.Code ?? "base",
                              CategoryName = cat.DisplayName ?? "Base",
                              CategoryGroup = cat.CategoryGroup,
                              rule.Multiplier,
                              rule.CapAmount,
                              CapPeriodLabel = cp != null ? cp.DisplayName : null,
                              rule.Notes
                          }).ToListAsync(cancellationToken);

        return rows.Select(r => new RewardRule(
            r.CategoryCode,
            r.CategoryName,
            r.CategoryGroup,
            r.Multiplier,
            FormatCapDisplay(r.CapAmount, r.CapPeriodLabel),
            r.Notes)).ToList();
    }

    private static string? FormatCapDisplay(decimal? capAmount, string? capPeriodLabel)
    {
        if (capAmount is null) return null;
        return capPeriodLabel is null
            ? $"${capAmount:N0} cap"
            : $"${capAmount:N0} per {capPeriodLabel.ToLowerInvariant()}";
    }
}
