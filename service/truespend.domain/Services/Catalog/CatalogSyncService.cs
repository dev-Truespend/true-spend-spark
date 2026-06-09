using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Catalog;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class CatalogSyncService(TrueSpendDbContext db) : ICatalogSyncService
{
    public async Task<short> UpsertIssuerByNameAsync(string issuerDisplayName, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var code = NormalizeCode(issuerDisplayName);
        var existing = await db.CardIssuers
            .Where(i => i.Code == code)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
        {
            existing.DisplayName = issuerDisplayName;
            existing.IsActive = true;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return existing.Id;
        }

        var entity = new CardIssuerEntity
        {
            Code = code,
            DisplayName = issuerDisplayName,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.CardIssuers.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<short> UpsertCategoryAsync(RewardsCcCategoryData category, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var existing = await db.Categories
            .Where(c => c.ProviderCategoryId == category.ProviderCategoryId)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
        {
            existing.DisplayName = category.DisplayName;
            existing.CategoryGroup = category.CategoryGroup;
            existing.SubcategoryGroup = category.SubcategoryGroup;
            existing.IsActive = true;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return existing.Id;
        }

        // Two upsert keys are possible: provider_category_id (preferred) and
        // (group, subgroup) tuple. The tuple branch keeps the catalog dedup'd
        // even if RapidAPI ever reuses the same group+subgroup with a new ID.
        var groupMatch = await db.Categories
            .Where(c => c.CategoryGroup == category.CategoryGroup && c.SubcategoryGroup == category.SubcategoryGroup)
            .FirstOrDefaultAsync(cancellationToken);
        if (groupMatch is not null)
        {
            groupMatch.ProviderCategoryId = category.ProviderCategoryId;
            groupMatch.DisplayName = category.DisplayName;
            groupMatch.IsActive = true;
            groupMatch.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return groupMatch.Id;
        }

        var entity = new CategoryEntity
        {
            Code = $"rcc_{category.ProviderCategoryId}",
            DisplayName = category.DisplayName,
            ProviderCategoryId = category.ProviderCategoryId,
            CategoryGroup = category.CategoryGroup,
            SubcategoryGroup = category.SubcategoryGroup,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Categories.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<CardProductUpsertResult> UpsertCardProductAsync(
        RewardsCcCardProductData product,
        short issuerId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var networkId = await GetNetworkIdByCodeAsync(product.Network, cancellationToken)
                        ?? await EnsureFallbackNetworkIdAsync(cancellationToken);
        var currencyId = await GetRewardCurrencyIdByCodeAsync(product.RewardCurrencyCode, cancellationToken)
                         ?? await EnsureFallbackRewardCurrencyIdAsync(cancellationToken);

        var existing = await db.CardProducts
            .Where(p => p.RewardsCcId == product.ProviderCardId)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is not null)
        {
            ApplyProductFields(existing, product, issuerId, networkId, currencyId);
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return new CardProductUpsertResult(existing.Id, Created: false);
        }

        var entity = new CardProductEntity
        {
            Code = NormalizeCode($"{product.ProviderIssuerId}-{product.Name}"),
            RewardsCcId = product.ProviderCardId,
            CreatedAt = now,
            UpdatedAt = now,
        };
        ApplyProductFields(entity, product, issuerId, networkId, currencyId);
        db.CardProducts.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return new CardProductUpsertResult(entity.Id, Created: true);
    }

    public async Task<CatalogUpsertCounts> ReplaceRewardRulesForCardAsync(
        int cardProductId,
        IReadOnlyList<RewardsCcRewardRuleData> rules,
        IReadOnlyDictionary<string, short> categoryIdByProviderId,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        // Replace = delete all existing rules for the card and insert the
        // current set. Cleaner than per-rule diff for ~5 rules per card.
        await db.RewardRules
            .Where(r => r.CardProductId == cardProductId)
            .ExecuteDeleteAsync(cancellationToken);

        if (rules.Count == 0) return new CatalogUpsertCounts(0, 0);

        // Cap periods are a tiny static lookup table. Load it once and resolve codes in memory rather
        // than issuing one query per reward rule (was an N+1 over rules × cards during catalog sync).
        var capPeriodIdByCode = await LoadCapPeriodIdByCodeAsync(cancellationToken);

        var created = 0;
        foreach (var data in rules)
        {
            if (!categoryIdByProviderId.TryGetValue(data.ProviderCategoryId, out var categoryId))
                continue; // category upsert failed earlier — skip the rule

            var capPeriodId = ResolveCapPeriodId(data.CapPeriodCode, capPeriodIdByCode);
            db.RewardRules.Add(new RewardRuleEntity
            {
                CardProductId = cardProductId,
                CategoryId = categoryId,
                Multiplier = data.Multiplier,
                CapAmount = data.CapAmount,
                CapPeriodId = capPeriodId,
                StartDate = data.EffectiveFrom,
                EndDate = data.EffectiveTo,
                RequiresActivation = data.RequiresActivation,
                IsMerchantLocked = data.IsMerchantLocked,
                MerchantBrand = data.MerchantBrand,
                Notes = data.Notes,
                CreatedAt = now,
                UpdatedAt = now,
            });
            created++;
        }
        await db.SaveChangesAsync(cancellationToken);
        return new CatalogUpsertCounts(created, 0);
    }

    public async Task<short?> GetCapPeriodIdByCodeAsync(string? code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var normalized = code.Trim().ToLowerInvariant();
        return await db.CapPeriods
            .Where(c => c.Code.ToLower() == normalized)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    // Loads the full cap-period lookup keyed by normalized code, mirroring GetCapPeriodIdByCodeAsync's
    // matching so the in-memory resolve below stays equivalent to the single-row query.
    private async Task<IReadOnlyDictionary<string, short>> LoadCapPeriodIdByCodeAsync(CancellationToken cancellationToken)
    {
        var rows = await db.CapPeriods
            .AsNoTracking()
            .Select(c => new { c.Id, c.Code })
            .ToListAsync(cancellationToken);

        var map = new Dictionary<string, short>(StringComparer.Ordinal);
        foreach (var row in rows)
        {
            if (string.IsNullOrWhiteSpace(row.Code)) continue;
            map[row.Code.Trim().ToLowerInvariant()] = row.Id; // codes are unique; last write wins defensively
        }
        return map;
    }

    private static short? ResolveCapPeriodId(string? code, IReadOnlyDictionary<string, short> capPeriodIdByCode)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var normalized = code.Trim().ToLowerInvariant();
        return capPeriodIdByCode.TryGetValue(normalized, out var id) ? id : null;
    }

    public async Task<short?> GetNetworkIdByCodeAsync(string code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var normalized = code.Trim().ToLowerInvariant();
        return await db.CardNetworks
            .Where(n => n.Code.ToLower() == normalized)
            .Select(n => (short?)n.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<short?> GetRewardCurrencyIdByCodeAsync(string? code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var normalized = code.Trim().ToLowerInvariant();
        return await db.RewardCurrencies
            .Where(c => c.Code.ToLower() == normalized)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    // Cards whose RapidAPI network value doesn't match an existing lookup row
    // (e.g. an obscure co-brand variant) still need to satisfy the not-null FK,
    // so we fall back to the first network row as a placeholder.
    private async Task<short> EnsureFallbackNetworkIdAsync(CancellationToken cancellationToken) =>
        await db.CardNetworks.OrderBy(n => n.Id).Select(n => n.Id).FirstAsync(cancellationToken);

    private async Task<short> EnsureFallbackRewardCurrencyIdAsync(CancellationToken cancellationToken) =>
        await db.RewardCurrencies.OrderBy(c => c.Id).Select(c => c.Id).FirstAsync(cancellationToken);

    private static void ApplyProductFields(
        CardProductEntity entity,
        RewardsCcCardProductData product,
        short issuerId,
        short networkId,
        short currencyId)
    {
        entity.IssuerId = issuerId;
        entity.NetworkId = networkId;
        entity.RewardCurrencyId = currencyId;
        entity.DisplayName = product.Name;
        entity.CardArtUrl = product.CardArtUrl ?? entity.CardArtUrl;
        entity.AnnualFee = product.AnnualFee;
        entity.TermsSummary = product.TermsSummary;
        entity.RewardCurrencyName = product.RewardCurrencyName;
        entity.BaseRewardRate = product.BaseRewardRate;
        entity.CardType = product.CardType;
        entity.CardUrl = product.CardUrl;
        entity.FxFee = product.FxFee;
        entity.CreditRange = product.CreditRange;
        entity.BaseRewardValuation = product.BaseRewardValuation;
        entity.HasLoungeAccess = product.HasLoungeAccess;
        entity.HasFreeCheckedBag = product.HasFreeCheckedBag;
        entity.HasTrustedTravelerCredit = product.HasTrustedTravelerCredit;
        entity.HasFreeHotelNight = product.HasFreeHotelNight;
        entity.SignupBonus = product.SignupBonusJson;
        entity.Perks = product.PerksJson;
        entity.AnnualSpendRewards = product.AnnualSpendRewardsJson;
        entity.IsActive = true;
    }

    private static string NormalizeCode(string value) =>
        new string((value ?? string.Empty).ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray())
            .Trim('-');
}
