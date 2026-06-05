namespace TrueSpend.Domain.Entities.Catalog;

public sealed class CardIssuerEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public bool IsActive { get; set; }
    public string? RewardsCcId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
