namespace TrueSpend.Domain.Entities.Finance;

public sealed class PlaidAccountEntity
{
    public int Id { get; set; }
    public int PlaidItemId { get; set; }
    public string PlaidAccountId { get; set; } = string.Empty;
    public string AccountName { get; set; } = string.Empty;
    public string? Mask { get; set; }
    public string Subtype { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
