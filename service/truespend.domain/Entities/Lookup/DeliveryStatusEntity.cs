namespace TrueSpend.Domain.Entities.Lookup;

public sealed class DeliveryStatusEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool IsTerminal { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
