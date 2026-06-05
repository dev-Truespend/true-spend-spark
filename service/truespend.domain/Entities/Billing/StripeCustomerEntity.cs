namespace TrueSpend.Domain.Entities.Billing;

public sealed class StripeCustomerEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string StripeCustomerId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
