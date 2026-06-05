namespace TrueSpend.Domain.Entities.Billing;

public sealed class CountryEntity
{
    public short Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public short? CurrencyId { get; set; }
    public bool IsSupported { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
