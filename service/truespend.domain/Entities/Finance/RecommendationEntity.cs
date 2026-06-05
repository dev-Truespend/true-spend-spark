namespace TrueSpend.Domain.Entities.Finance;

public sealed class RecommendationEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int? MerchantId { get; set; }
    public int RecommendedUserCardId { get; set; }
    public short? CategoryId { get; set; }
    public decimal? ExpectedRewardRate { get; set; }
    public decimal? ExpectedRewardAmount { get; set; }
    public short ContextId { get; set; }
    public DateTimeOffset GeneratedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
