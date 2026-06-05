namespace TrueSpend.Domain.Entities.Catalog;

public sealed class CategoryAliasEntity
{
    public int Id { get; set; }
    public short CategoryId { get; set; }
    public string Alias { get; set; } = string.Empty;
    public string? Source { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
