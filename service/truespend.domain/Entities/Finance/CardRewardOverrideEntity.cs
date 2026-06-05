namespace TrueSpend.Domain.Entities.Finance;

public sealed class CardRewardOverrideEntity
{
    public int Id { get; set; }
    public int UserCardId { get; set; }
    public short? CategoryId { get; set; }
    public decimal Multiplier { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
