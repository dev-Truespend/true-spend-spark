using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Catalog;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class CatalogSyncService(TrueSpendDbContext db) : ICatalogSyncService
{
    public async Task<CatalogUpsertCounts> UpsertIssuersAsync(
        IReadOnlyList<RewardsCcIssuerData> issuers,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (issuers.Count == 0) return new CatalogUpsertCounts(0, 0);

        var providerIds = issuers.Select(i => i.ProviderIssuerId).ToArray();
        var existing = await db.CardIssuers
            .Where(i => i.RewardsCcId != null && providerIds.Contains(i.RewardsCcId))
            .ToDictionaryAsync(i => i.RewardsCcId!, cancellationToken);

        var created = 0;
        var updated = 0;
        foreach (var data in issuers)
        {
            if (existing.TryGetValue(data.ProviderIssuerId, out var entity))
            {
                entity.DisplayName = data.Name;
                entity.LogoUrl = data.LogoUrl ?? entity.LogoUrl;
                entity.IsActive = true;
                entity.UpdatedAt = now;
                updated++;
            }
            else
            {
                db.CardIssuers.Add(new CardIssuerEntity
                {
                    Code = NormalizeCode(data.Name),
                    DisplayName = data.Name,
                    LogoUrl = data.LogoUrl,
                    IsActive = true,
                    RewardsCcId = data.ProviderIssuerId,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                created++;
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        return new CatalogUpsertCounts(created, updated);
    }

    public async Task<int> DeactivateMissingIssuersAsync(
        IReadOnlyCollection<string> seenProviderIds,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (seenProviderIds.Count == 0) return 0;

        var stale = await db.CardIssuers
            .Where(i => i.IsActive
                        && i.RewardsCcId != null
                        && !seenProviderIds.Contains(i.RewardsCcId))
            .ToListAsync(cancellationToken);

        foreach (var entity in stale)
        {
            entity.IsActive = false;
            entity.UpdatedAt = now;
        }
        if (stale.Count > 0) await db.SaveChangesAsync(cancellationToken);
        return stale.Count;
    }

    public async Task<CatalogUpsertCounts> UpsertCardProductsAsync(
        IReadOnlyList<RewardsCcCardProductData> products,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (products.Count == 0) return new CatalogUpsertCounts(0, 0);

        var providerIds = products.Select(p => p.ProviderCardId).ToArray();
        var existing = await db.CardProducts
            .Where(p => p.RewardsCcId != null && providerIds.Contains(p.RewardsCcId))
            .ToDictionaryAsync(p => p.RewardsCcId!, cancellationToken);

        var issuerProviderIds = products.Select(p => p.ProviderIssuerId).Distinct().ToArray();
        var issuerLookup = await db.CardIssuers
            .Where(i => i.RewardsCcId != null && issuerProviderIds.Contains(i.RewardsCcId))
            .ToDictionaryAsync(i => i.RewardsCcId!, i => i.Id, cancellationToken);

        var created = 0;
        var updated = 0;
        foreach (var data in products)
        {
            if (!issuerLookup.TryGetValue(data.ProviderIssuerId, out var issuerId))
                continue; // skip products whose issuer has not been synced yet

            var networkId = await GetNetworkIdByCodeAsync(data.Network, cancellationToken) ?? 0;
            if (networkId == 0) continue; // unknown network — skip

            var currencyId = await GetRewardCurrencyIdByCodeAsync(data.RewardCurrencyCode, cancellationToken) ?? 0;
            if (currencyId == 0) continue;

            if (existing.TryGetValue(data.ProviderCardId, out var entity))
            {
                entity.IssuerId = issuerId;
                entity.NetworkId = networkId;
                entity.RewardCurrencyId = currencyId;
                entity.DisplayName = data.Name;
                entity.CardArtUrl = data.CardArtUrl ?? entity.CardArtUrl;
                entity.AnnualFee = data.AnnualFee;
                entity.TermsSummary = data.TermsSummary;
                entity.RewardCurrencyName = data.RewardCurrencyName;
                entity.BaseRewardRate = data.BaseRewardRate;
                entity.IsActive = true;
                entity.UpdatedAt = now;
                updated++;
            }
            else
            {
                db.CardProducts.Add(new CardProductEntity
                {
                    IssuerId = issuerId,
                    NetworkId = networkId,
                    RewardCurrencyId = currencyId,
                    Code = NormalizeCode($"{data.ProviderIssuerId}-{data.Name}"),
                    DisplayName = data.Name,
                    CardArtUrl = data.CardArtUrl,
                    AnnualFee = data.AnnualFee,
                    TermsSummary = data.TermsSummary,
                    RewardCurrencyName = data.RewardCurrencyName,
                    BaseRewardRate = data.BaseRewardRate,
                    RewardsCcId = data.ProviderCardId,
                    IsActive = true,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                created++;
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        return new CatalogUpsertCounts(created, updated);
    }

    public async Task<int> DeactivateMissingCardProductsAsync(
        IReadOnlyCollection<string> seenProviderIds,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (seenProviderIds.Count == 0) return 0;
        var stale = await db.CardProducts
            .Where(p => p.IsActive && p.RewardsCcId != null && !seenProviderIds.Contains(p.RewardsCcId))
            .ToListAsync(cancellationToken);
        foreach (var entity in stale)
        {
            entity.IsActive = false;
            entity.UpdatedAt = now;
        }
        if (stale.Count > 0) await db.SaveChangesAsync(cancellationToken);
        return stale.Count;
    }

    public async Task<IReadOnlyList<CardProductIdLookup>> GetCardProductIdLookupsAsync(CancellationToken cancellationToken) =>
        await db.CardProducts
            .AsNoTracking()
            .Where(p => p.IsActive && p.RewardsCcId != null)
            .Select(p => new CardProductIdLookup(p.Id, p.RewardsCcId!))
            .ToListAsync(cancellationToken);

    public async Task<CatalogUpsertCounts> UpsertRewardRulesForCardAsync(
        int cardProductId,
        IReadOnlyList<RewardsCcRewardRuleData> rules,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (rules.Count == 0) return new CatalogUpsertCounts(0, 0);

        var existing = await db.RewardRules
            .Where(r => r.CardProductId == cardProductId)
            .ToListAsync(cancellationToken);

        var created = 0;
        var updated = 0;
        foreach (var data in rules)
        {
            var categoryId = await GetCategoryIdByCodeAsync(data.CategoryCode, cancellationToken);
            var capPeriodId = await GetCapPeriodIdByCodeAsync(data.CapPeriodCode, cancellationToken);
            var match = existing.FirstOrDefault(r => r.CategoryId == categoryId && r.Multiplier == data.Multiplier);
            if (match is not null)
            {
                match.CapAmount = data.CapAmount;
                match.CapPeriodId = capPeriodId;
                match.StartDate = data.EffectiveFrom;
                match.EndDate = data.EffectiveTo;
                match.RequiresActivation = data.RequiresActivation;
                match.Notes = data.Notes;
                match.UpdatedAt = now;
                updated++;
            }
            else
            {
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
                    Notes = data.Notes,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                created++;
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        return new CatalogUpsertCounts(created, updated);
    }

    public async Task<int> ExpireMissingRewardRulesAsync(
        int cardProductId,
        IReadOnlyCollection<(short? CategoryId, decimal Multiplier)> seenKeys,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        var existing = await db.RewardRules
            .Where(r => r.CardProductId == cardProductId)
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(now.UtcDateTime);
        var expired = 0;
        foreach (var rule in existing)
        {
            var key = (rule.CategoryId, rule.Multiplier);
            if (seenKeys.Contains(key)) continue;
            if (rule.EndDate.HasValue && rule.EndDate.Value <= today) continue;
            rule.EndDate = today;
            rule.UpdatedAt = now;
            expired++;
        }
        if (expired > 0) await db.SaveChangesAsync(cancellationToken);
        return expired;
    }

    public async Task<short?> GetCategoryIdByCodeAsync(string? code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        return await db.Categories
            .Where(c => c.Code == code && c.IsActive)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<short?> GetCapPeriodIdByCodeAsync(string? code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        return await db.CapPeriods
            .Where(c => c.Code == code)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
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
        if (string.IsNullOrWhiteSpace(code))
        {
            return await db.RewardCurrencies
                .OrderBy(c => c.Id)
                .Select(c => (short?)c.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }
        var normalized = code.Trim().ToLowerInvariant();
        return await db.RewardCurrencies
            .Where(c => c.Code.ToLower() == normalized)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private static string NormalizeCode(string value) =>
        new string((value ?? string.Empty).ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray())
            .Trim('-');
}
