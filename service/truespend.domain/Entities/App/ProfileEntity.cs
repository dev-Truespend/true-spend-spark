namespace TrueSpend.Domain.Entities.App;

public sealed class ProfileEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? AvatarUrl { get; set; }
    public short? CountryId { get; set; }
    public short? CurrencyId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
