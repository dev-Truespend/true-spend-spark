namespace TrueSpend.Domain.Entities.Catalog;

public sealed class CardProductRequestEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string IssuerName { get; set; } = string.Empty;
    public string CardName { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public short? ApprovedIssuerId { get; set; }
    public int? ApprovedCardProductId { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public string? ReviewNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
