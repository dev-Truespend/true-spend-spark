namespace TrueSpend.Domain.Entities.Finance;

public sealed class TransactionEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Source { get; set; } = "manual";
    public string? PlaidTransactionId { get; set; }
    public int? PlaidAccountId { get; set; }
    public int UserCardId { get; set; }
    public int? MerchantId { get; set; }
    public short? CategoryId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly TransactionDate { get; set; }
    public TimeOnly? TransactionTime { get; set; }
    public bool IsPending { get; set; }
    public string? Description { get; set; }
    public string? LocationLabel { get; set; }
    public decimal? LocationLat { get; set; }
    public decimal? LocationLng { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
