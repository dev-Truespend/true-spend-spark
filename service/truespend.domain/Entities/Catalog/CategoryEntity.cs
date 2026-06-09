namespace TrueSpend.Domain.Entities.Catalog;

public sealed class CategoryEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public string? ProviderCategoryId { get; set; }
    public string? CategoryGroup { get; set; }
    public string? SubcategoryGroup { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
