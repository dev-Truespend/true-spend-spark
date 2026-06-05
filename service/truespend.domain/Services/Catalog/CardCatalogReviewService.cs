using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class CardCatalogReviewService(TrueSpendDbContext db) : ICardCatalogReviewService
{
    private const string PendingStatus = "pending";
    private const string AutoResolvedStatus = "auto_resolved";

    public async Task<int> UpsertReviewItemsAsync(
        IReadOnlyList<(string Provider, string ProviderCardId, string ReasonCode, decimal? Confidence, string? DetailsJson)> items,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (items.Count == 0) return 0;

        var keys = items.Select(i => new { i.Provider, i.ProviderCardId, i.ReasonCode }).ToList();
        var providerSet = keys.Select(k => k.Provider).Distinct().ToArray();
        var providerCardSet = keys.Select(k => k.ProviderCardId).Distinct().ToArray();
        var reasonSet = keys.Select(k => k.ReasonCode).Distinct().ToArray();

        var existing = await db.CardProductReviewItems
            .Where(r => providerSet.Contains(r.Provider)
                        && providerCardSet.Contains(r.ProviderCardId)
                        && reasonSet.Contains(r.ReasonCode))
            .ToListAsync(cancellationToken);

        var created = 0;
        foreach (var item in items)
        {
            var match = existing.FirstOrDefault(r =>
                r.Provider == item.Provider
                && r.ProviderCardId == item.ProviderCardId
                && r.ReasonCode == item.ReasonCode);
            if (match is not null)
            {
                match.Confidence = item.Confidence ?? match.Confidence;
                match.Details = item.DetailsJson ?? match.Details;
                if (match.Status == AutoResolvedStatus) match.Status = PendingStatus;
                match.UpdatedAt = now;
            }
            else
            {
                db.CardProductReviewItems.Add(new CardProductReviewItemEntity
                {
                    Provider = item.Provider,
                    ProviderCardId = item.ProviderCardId,
                    ReasonCode = item.ReasonCode,
                    Confidence = item.Confidence,
                    Details = item.DetailsJson,
                    Status = PendingStatus,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                created++;
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        return created;
    }

    public async Task<int> AutoResolvePendingItemsAsync(
        IReadOnlyCollection<(string Provider, string ProviderCardId)> resolvedKeys,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (resolvedKeys.Count == 0) return 0;

        var providers = resolvedKeys.Select(k => k.Provider).Distinct().ToArray();
        var providerCards = resolvedKeys.Select(k => k.ProviderCardId).Distinct().ToArray();

        var pending = await db.CardProductReviewItems
            .Where(r => r.Status == PendingStatus
                        && providers.Contains(r.Provider)
                        && providerCards.Contains(r.ProviderCardId))
            .ToListAsync(cancellationToken);

        var resolvedSet = resolvedKeys.ToHashSet();
        var resolved = 0;
        foreach (var item in pending)
        {
            if (!resolvedSet.Contains((item.Provider, item.ProviderCardId))) continue;
            item.Status = AutoResolvedStatus;
            item.ResolvedAt = now;
            item.UpdatedAt = now;
            resolved++;
        }
        if (resolved > 0) await db.SaveChangesAsync(cancellationToken);
        return resolved;
    }

    public async Task<IReadOnlyList<(string ProviderIssuerId, string Name)>> GetIssuersMissingMappingAsync(
        string provider,
        CancellationToken cancellationToken)
    {
        if (provider != "rewardsCc") return Array.Empty<(string, string)>();
        // Phase 1: issuer mismatches are detected during sync; this read returns nothing because
        // mappings are populated atomically. Hook exists for future provider-vs-internal diffs.
        await Task.CompletedTask;
        return Array.Empty<(string, string)>();
    }

    public async Task<IReadOnlyList<(string ProviderCardId, string ProviderIssuerId, string Name)>> GetCardProductsMissingMappingAsync(
        string provider,
        CancellationToken cancellationToken)
    {
        if (provider != "rewardsCc") return Array.Empty<(string, string, string)>();
        await Task.CompletedTask;
        return Array.Empty<(string, string, string)>();
    }
}
