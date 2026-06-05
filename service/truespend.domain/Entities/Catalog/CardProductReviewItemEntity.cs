namespace TrueSpend.Domain.Entities.Catalog;

public sealed class CardProductReviewItemEntity
{
    public int Id { get; set; }
    public string Provider { get; set; } = string.Empty;
    public string ProviderCardId { get; set; } = string.Empty;
    public string ReasonCode { get; set; } = string.Empty;
    public decimal? Confidence { get; set; }
    public string? Details { get; set; }
    public string Status { get; set; } = "pending";
    public int? CardProductId { get; set; }
    public Guid? ResolvedByUserId { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public string? ResolutionNotes { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
