namespace TrueSpend.Domain.Entities.Finance;

public sealed class MerchantVisitEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int MerchantId { get; set; }
    public short? SelectedCategoryId { get; set; }
    public DateTimeOffset VisitedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
