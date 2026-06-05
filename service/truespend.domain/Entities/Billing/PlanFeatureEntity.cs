namespace TrueSpend.Domain.Entities.Billing;

public sealed class PlanFeatureEntity
{
    public int Id { get; set; }
    public short PlanId { get; set; }
    public short FeatureId { get; set; }
    public string Value { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
