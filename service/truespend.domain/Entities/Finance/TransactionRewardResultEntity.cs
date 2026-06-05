namespace TrueSpend.Domain.Entities.Finance;

public sealed class TransactionRewardResultEntity
{
    public int Id { get; set; }
    public int TransactionId { get; set; }
    public decimal EarnedRate { get; set; }
    public decimal EarnedAmount { get; set; }
    public short? RewardCurrencyId { get; set; }
    public int? RuleAppliedId { get; set; }
    public DateTimeOffset ComputedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
