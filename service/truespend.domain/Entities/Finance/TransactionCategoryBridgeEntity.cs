namespace TrueSpend.Domain.Entities.Finance;

public sealed class TransactionCategoryBridgeEntity
{
    public short TransactionCategoryId { get; set; }
    public string SubcategoryGroup { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
