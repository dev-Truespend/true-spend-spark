namespace TrueSpend.Domain.Entities.Finance;

// An active "the user is inside this area" window (mall/plaza/cluster, or a personal place). While it
// covers an arrival point and has not expired, individual best-card pushes for stores in the area are
// suppressed. TTL-expiry only for now; exit-driven close arrives with the visit lifecycle (item 8).
public sealed class GeoAreaSessionEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public decimal CenterLat { get; set; }
    public decimal CenterLng { get; set; }
    public decimal RadiusMeters { get; set; }
    public string Mode { get; set; } = string.Empty;
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
