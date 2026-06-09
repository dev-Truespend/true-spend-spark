namespace TrueSpend.Domain.Entities.Finance;

public sealed class TransactionCategoryEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public short? ParentId { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsOutflow { get; set; } = true;
    public string? Icon { get; set; }
    public short? DisplayOrder { get; set; }
    public string Source { get; set; } = "plaid";
    public string? SourceVersion { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
