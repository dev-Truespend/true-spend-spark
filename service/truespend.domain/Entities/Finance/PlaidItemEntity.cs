namespace TrueSpend.Domain.Entities.Finance;

public sealed class PlaidItemEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string PlaidItemId { get; set; } = string.Empty;
    public string PlaidInstitutionId { get; set; } = string.Empty;
    public string InstitutionName { get; set; } = string.Empty;
    public string? InstitutionLogoUrl { get; set; }
    public string AccessTokenEncrypted { get; set; } = string.Empty;
    public short StatusId { get; set; }
    public DateTimeOffset? LastSyncAt { get; set; }
    public string? TransactionSyncCursor { get; set; }
    public DateTimeOffset? LastTransactionSyncAt { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
