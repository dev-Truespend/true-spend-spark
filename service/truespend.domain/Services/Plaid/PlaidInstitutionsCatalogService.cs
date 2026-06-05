using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidInstitutionsCatalogService(TrueSpendDbContext db) : IPlaidInstitutionsCatalogService
{
    public async Task<InstitutionUpsertCounts> UpsertInstitutionsAsync(
        IReadOnlyList<PlaidInstitutionData> institutions,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (institutions.Count == 0) return new InstitutionUpsertCounts(0, 0);

        var providerIds = institutions.Select(i => i.PlaidInstitutionId).ToArray();
        var existing = await db.PlaidInstitutions
            .Where(i => providerIds.Contains(i.PlaidInstitutionId))
            .ToDictionaryAsync(i => i.PlaidInstitutionId, cancellationToken);

        var created = 0;
        var updated = 0;
        foreach (var data in institutions)
        {
            var normalized = Normalize(data.Name);
            if (existing.TryGetValue(data.PlaidInstitutionId, out var entity))
            {
                entity.Name = data.Name;
                entity.NormalizedName = normalized;
                entity.CountryCode = data.CountryCode;
                entity.LogoUrl = data.LogoUrl;
                entity.PrimaryColor = data.PrimaryColor;
                entity.Url = data.Url;
                entity.Oauth = data.Oauth;
                entity.Products = data.Products.ToArray();
                entity.RoutingNumbers = data.RoutingNumbers.ToArray();
                entity.IsActive = true;
                entity.LastSyncedAt = now;
                entity.UpdatedAt = now;
                updated++;
            }
            else
            {
                db.PlaidInstitutions.Add(new PlaidInstitutionEntity
                {
                    PlaidInstitutionId = data.PlaidInstitutionId,
                    Name = data.Name,
                    NormalizedName = normalized,
                    CountryCode = data.CountryCode,
                    LogoUrl = data.LogoUrl,
                    PrimaryColor = data.PrimaryColor,
                    Url = data.Url,
                    Oauth = data.Oauth,
                    Products = data.Products.ToArray(),
                    RoutingNumbers = data.RoutingNumbers.ToArray(),
                    IsActive = true,
                    LastSyncedAt = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
                created++;
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        return new InstitutionUpsertCounts(created, updated);
    }

    public async Task<int> DeactivateMissingInstitutionsAsync(
        IReadOnlyCollection<string> seenPlaidInstitutionIds,
        DateTimeOffset now,
        CancellationToken cancellationToken)
    {
        if (seenPlaidInstitutionIds.Count == 0) return 0;

        var stale = await db.PlaidInstitutions
            .Where(i => i.IsActive && !seenPlaidInstitutionIds.Contains(i.PlaidInstitutionId))
            .ToListAsync(cancellationToken);

        if (stale.Count == 0) return 0;

        foreach (var entity in stale)
        {
            entity.IsActive = false;
            entity.UpdatedAt = now;
        }
        await db.SaveChangesAsync(cancellationToken);
        return stale.Count;
    }

    private static string Normalize(string name) =>
        new string((name ?? string.Empty).ToLowerInvariant().Where(c => char.IsLetterOrDigit(c) || c == ' ').ToArray()).Trim();
}
