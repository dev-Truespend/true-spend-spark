namespace TrueSpend.Domain.Entities.Finance;

// A recurring dwell zone (home/work) auto-detected from clustered location history. While an arrival
// falls inside one, best-card pushes are suppressed — the user lives/works here, not shopping. No UI:
// detected offline by the personal-place detection job.
public sealed class PersonalPlaceEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public decimal CenterLat { get; set; }
    public decimal CenterLng { get; set; }
    public decimal RadiusMeters { get; set; }
    public string Kind { get; set; } = string.Empty;
    public int VisitCount { get; set; }
    public DateTimeOffset LastDetectedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
