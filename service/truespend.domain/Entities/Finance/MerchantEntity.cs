namespace TrueSpend.Domain.Entities.Finance;

public sealed class MerchantEntity
{
    public int Id { get; set; }
    public string CanonicalName { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public short? CategoryId { get; set; }
    public string? MapkitPlaceId { get; set; }
    public string? GooglePlaceId { get; set; }
    public decimal? Lat { get; set; }
    public decimal? Lng { get; set; }
    public string? Address { get; set; }
    public bool IsMultiCategory { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
