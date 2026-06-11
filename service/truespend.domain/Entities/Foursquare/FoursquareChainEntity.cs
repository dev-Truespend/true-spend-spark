namespace TrueSpend.Domain.Entities.Foursquare;

public sealed class FoursquareChainEntity
{
    public int Id { get; set; }
    public string? ProviderChainId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public short? DefaultCategoryId { get; set; }
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
