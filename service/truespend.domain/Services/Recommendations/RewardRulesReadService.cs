using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;

namespace TrueSpend.Domain.Services.Recommendations;

public sealed class RewardRulesReadService(TrueSpendDbContext db) : IRewardRulesReadService
{
    public async Task<IReadOnlyList<UserCardReward>> GetUserRewardProfileAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var cards = await (from card in db.UserCards.AsNoTracking().Where(x => x.UserId == user.UserId && x.IsActive)
                           join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
                           from product in productJoin.DefaultIfEmpty()
                           join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
                           from issuer in issuerJoin.DefaultIfEmpty()
                           join source in db.CardSources.AsNoTracking() on card.SourceId equals source.Id into sourceJoin
                           from source in sourceJoin.DefaultIfEmpty()
                           join currency in db.RewardCurrencies.AsNoTracking() on product.RewardCurrencyId equals currency.Id into currencyJoin
                           from currency in currencyJoin.DefaultIfEmpty()
                           select new
                           {
                               CardId = card.Id,
                               CardProductId = card.CardProductId,
                               Nickname = card.Nickname,
                               ProductDisplay = product != null ? product.DisplayName : null,
                               CustomCardName = card.CustomCardName,
                               IssuerDisplay = issuer != null ? issuer.DisplayName : null,
                               CustomIssuerName = card.CustomIssuerName,
                               LastFour = card.LastFour,
                               SourceCode = source != null ? source.Code : null,
                               IsPrimary = card.IsPrimary,
                               SyncStatus = card.SyncStatus,
                               CardArtUrl = product != null ? product.CardArtUrl : null,
                               BaseRate = product != null ? product.BaseRewardRate : 1.0m,
                               RewardCurrencyCode = currency != null ? currency.Code : null
                           })
                          .ToListAsync(cancellationToken);

        if (cards.Count == 0)
        {
            return Array.Empty<UserCardReward>();
        }

        var productIds = cards.Where(c => c.CardProductId != null).Select(c => c.CardProductId!.Value).Distinct().ToArray();
        var cardIds = cards.Select(c => c.CardId).ToArray();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var rules = await (from rule in db.RewardRules.AsNoTracking()
                           where productIds.Contains(rule.CardProductId)
                                 && (rule.StartDate == null || rule.StartDate <= today)
                                 && (rule.EndDate == null || rule.EndDate >= today)
                           join category in db.Categories.AsNoTracking() on rule.CategoryId equals category.Id into categoryJoin
                           from category in categoryJoin.DefaultIfEmpty()
                           select new { rule.CardProductId, CategoryCode = category != null ? category.Code : null, rule.Multiplier, rule.IsMerchantLocked, rule.MerchantBrand })
                          .ToListAsync(cancellationToken);

        var overrides = await (from o in db.CardRewardOverrides.AsNoTracking()
                               where cardIds.Contains(o.UserCardId)
                               join category in db.Categories.AsNoTracking() on o.CategoryId equals category.Id into categoryJoin
                               from category in categoryJoin.DefaultIfEmpty()
                               select new { o.UserCardId, CategoryCode = category != null ? category.Code : null, o.Multiplier })
                              .ToListAsync(cancellationToken);

        // Generic rules feed RatesByCategory (max per category). Merchant-locked rules are kept
        // separate so they only credit when the transaction's merchant matches the brand.
        var rulesByProduct = rules
            .Where(r => r.CategoryCode != null && !r.IsMerchantLocked)
            .GroupBy(r => r.CardProductId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.CategoryCode!)
                      .ToDictionary(x => x.Key, x => x.Max(r => r.Multiplier)));

        var lockedRulesByProduct = rules
            .Where(r => r.CategoryCode != null && r.IsMerchantLocked)
            .GroupBy(r => r.CardProductId)
            .ToDictionary(
                g => g.Key,
                g => (IReadOnlyList<MerchantLockedRate>)g
                    .Select(x => new MerchantLockedRate(x.CategoryCode!, x.Multiplier, x.MerchantBrand))
                    .ToList());

        var overridesByCard = overrides
            .Where(o => o.CategoryCode != null)
            .GroupBy(o => o.UserCardId)
            .ToDictionary(
                g => g.Key,
                g => g.GroupBy(x => x.CategoryCode!)
                      .ToDictionary(x => x.Key, x => x.Max(o => o.Multiplier)));

        return cards.Select(c =>
        {
            var rates = new Dictionary<string, decimal>(StringComparer.OrdinalIgnoreCase);
            if (c.CardProductId is { } productId && rulesByProduct.TryGetValue(productId, out var productRates))
            {
                foreach (var pair in productRates) rates[pair.Key] = pair.Value;
            }
            if (overridesByCard.TryGetValue(c.CardId, out var cardOverrides))
            {
                foreach (var pair in cardOverrides) rates[pair.Key] = pair.Value;
            }

            var lockedRates = c.CardProductId is { } lockedProductId
                              && lockedRulesByProduct.TryGetValue(lockedProductId, out var locked)
                ? locked
                : Array.Empty<MerchantLockedRate>();

            var summary = new CardSummary(
                c.CardId,
                c.Nickname ?? c.ProductDisplay ?? c.CustomCardName ?? "Card",
                c.IssuerDisplay ?? c.CustomIssuerName ?? "Unknown issuer",
                c.LastFour,
                c.SourceCode ?? "manual",
                c.IsPrimary,
                c.SyncStatus,
                c.CardArtUrl);

            return new UserCardReward(summary, c.CardProductId, c.BaseRate, rates, c.RewardCurrencyCode ?? "cash_back", lockedRates);
        }).ToList();
    }
}
