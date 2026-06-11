using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Foursquare;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class FoursquarePlacesWriteService(TrueSpendDbContext db) : IFoursquarePlacesWriteService
{
    public async Task<(int ChainId, bool Created)> UpsertChainAsync(
        string? providerChainId,
        string name,
        short? defaultCategoryId,
        CancellationToken cancellationToken)
    {
        var normalized = Normalize(name);
        var existing = !string.IsNullOrWhiteSpace(providerChainId)
            ? await db.FoursquareChains.FirstOrDefaultAsync(c => c.ProviderChainId == providerChainId, cancellationToken)
            : await db.FoursquareChains.FirstOrDefaultAsync(c => c.ProviderChainId == null && c.NormalizedName == normalized, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        if (existing is not null)
        {
            existing.Name = name;
            existing.NormalizedName = normalized;
            if (defaultCategoryId.HasValue) existing.DefaultCategoryId = defaultCategoryId;
            existing.IsActive = true;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return (existing.Id, false);
        }

        var entity = new FoursquareChainEntity
        {
            ProviderChainId = providerChainId,
            Name = name,
            NormalizedName = normalized,
            DefaultCategoryId = defaultCategoryId,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.FoursquareChains.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return (entity.Id, true);
    }

    public async Task<(int PlaceId, bool Created)> UpsertPlaceAsync(
        ProviderPlace place,
        int? chainId,
        short? categoryId,
        string source,
        CancellationToken cancellationToken)
    {
        var existing = await db.FoursquarePlaces
            .FirstOrDefaultAsync(p => p.Provider == place.Provider && p.ProviderPlaceId == place.ProviderPlaceId, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        if (existing is not null)
        {
            existing.ChainId = chainId ?? existing.ChainId;
            existing.Name = place.Name;
            existing.NormalizedName = Normalize(place.Name);
            existing.CategoryId = categoryId ?? existing.CategoryId;
            existing.Lat = place.Lat;
            existing.Lng = place.Lng;
            existing.Address = place.Address;
            existing.Locality = place.Locality;
            existing.Region = place.Region;
            existing.PostalCode = place.PostalCode;
            existing.Country = place.Country;
            existing.IsActive = true;
            existing.LastSeenAt = now;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return (existing.Id, false);
        }

        var entity = new FoursquarePlaceEntity
        {
            Provider = place.Provider,
            ProviderPlaceId = place.ProviderPlaceId,
            ChainId = chainId,
            Name = place.Name,
            NormalizedName = Normalize(place.Name),
            CategoryId = categoryId,
            Lat = place.Lat,
            Lng = place.Lng,
            Address = place.Address,
            Locality = place.Locality,
            Region = place.Region,
            PostalCode = place.PostalCode,
            Country = place.Country,
            Source = source,
            IsActive = true,
            LastSeenAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.FoursquarePlaces.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return (entity.Id, true);
    }

    private static string Normalize(string name) => name.Trim().ToLowerInvariant();
}
