namespace TrueSpend.Domain.Entities.Billing;

public sealed class PlanPriceEntity
{
    public int Id { get; set; }
    public short PlanId { get; set; }
    public short CountryId { get; set; }
    public short PeriodId { get; set; }
    public decimal Price { get; set; }
    public string? StripePriceId { get; set; }
    public DateOnly? EffectiveFrom { get; set; }
    public DateOnly? EffectiveTo { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
