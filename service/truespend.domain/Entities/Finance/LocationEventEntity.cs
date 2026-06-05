namespace TrueSpend.Domain.Entities.Finance;

public sealed class LocationEventEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public decimal Lat { get; set; }
    public decimal Lng { get; set; }
    public decimal? AccuracyMeters { get; set; }
    public int? MerchantId { get; set; }
    public short EventTypeId { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
