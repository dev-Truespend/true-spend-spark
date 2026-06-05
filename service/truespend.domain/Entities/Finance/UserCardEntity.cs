namespace TrueSpend.Domain.Entities.Finance;

public sealed class UserCardEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int? CardProductId { get; set; }
    public int? CatalogRequestId { get; set; }
    public int? PlaidAccountId { get; set; }
    public short SourceId { get; set; }
    public string SyncStatus { get; set; } = "active";
    public string? CustomIssuerName { get; set; }
    public string? CustomCardName { get; set; }
    public string? Nickname { get; set; }
    public string? LastFour { get; set; }
    public bool IsPrimary { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
