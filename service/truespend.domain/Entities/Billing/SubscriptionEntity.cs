namespace TrueSpend.Domain.Entities.Billing;

public sealed class SubscriptionEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short PlanId { get; set; }
    public int PlanPriceId { get; set; }
    public string StripeSubscriptionId { get; set; } = string.Empty;
    public short StatusId { get; set; }
    public DateTimeOffset CurrentPeriodStart { get; set; }
    public DateTimeOffset CurrentPeriodEnd { get; set; }
    public DateTimeOffset? TrialEnd { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public DateTimeOffset? CanceledAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
