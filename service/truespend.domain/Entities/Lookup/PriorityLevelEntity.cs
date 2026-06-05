namespace TrueSpend.Domain.Entities.Lookup;

public sealed class PriorityLevelEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public short SortOrder { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
