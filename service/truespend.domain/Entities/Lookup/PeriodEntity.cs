namespace TrueSpend.Domain.Entities.Lookup;

public sealed class PeriodEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
}
