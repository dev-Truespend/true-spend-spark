namespace TrueSpend.Domain.Entities.Foursquare;

public sealed class FoursquareCategoryBridgeEntity
{
    public int Id { get; set; }
    public string FoursquareCategoryId { get; set; } = string.Empty;
    public string FoursquareCategoryPath { get; set; } = string.Empty;
    public short? CategoryId { get; set; }
    public bool IncludeDescendants { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
