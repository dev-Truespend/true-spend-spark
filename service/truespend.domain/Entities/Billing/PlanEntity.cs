namespace TrueSpend.Domain.Entities.Billing;

public sealed class PlanEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public short TrialDays { get; set; }
    public string? StripeProductId { get; set; }
    public bool IsActive { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
