namespace TrueSpend.Domain.Entities.Foursquare;

// The `geog` column is a PostGIS generated-stored column (from lat/lng) and is intentionally
// not mapped here — it backs the GiST index for raw spatial queries. Place matching prefilters
// by lat/lng bounding box (btree-free) and ranks in memory; see FoursquarePlacesReadService.
public sealed class FoursquarePlaceEntity
{
    public int Id { get; set; }
    public string Provider { get; set; } = "foursquare";
    public string ProviderPlaceId { get; set; } = string.Empty;
    public int? ChainId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public short? CategoryId { get; set; }
    public decimal Lat { get; set; }
    public decimal Lng { get; set; }
    public string? Address { get; set; }
    public string? Locality { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
    public string Source { get; set; } = "catalog_sync";
    public bool IsActive { get; set; } = true;
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
