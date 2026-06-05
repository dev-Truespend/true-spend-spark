namespace TrueSpend.Domain.Entities.Finance;

public sealed class MissedRewardEventEntity
{
    public int Id { get; set; }
    public int TransactionId { get; set; }
    public int BetterUserCardId { get; set; }
    public decimal ActualRewardAmount { get; set; }
    public decimal PotentialRewardAmount { get; set; }
    public decimal MissedAmount { get; set; }
    public bool IsDismissed { get; set; }
    public DateTimeOffset DetectedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
