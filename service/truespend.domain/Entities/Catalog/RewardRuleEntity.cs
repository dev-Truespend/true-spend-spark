namespace TrueSpend.Domain.Entities.Catalog;

public sealed class RewardRuleEntity
{
    public int Id { get; set; }
    public int CardProductId { get; set; }
    public short? CategoryId { get; set; }
    public decimal Multiplier { get; set; }
    public decimal? CapAmount { get; set; }
    public short? CapPeriodId { get; set; }
    public DateOnly? StartDate { get; set; }
    public DateOnly? EndDate { get; set; }
    public bool RequiresActivation { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
