namespace TrueSpend.Domain.Entities.Billing;

public sealed class PaymentMethodEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int StripeCustomerId { get; set; }
    public string StripePaymentMethodId { get; set; } = string.Empty;
    public string? Brand { get; set; }
    public string? LastFour { get; set; }
    public short? ExpMonth { get; set; }
    public short? ExpYear { get; set; }
    public bool IsDefault { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
