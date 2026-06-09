namespace TrueSpend.Domain.Entities.App;

// One row per user per UTC day. Extensible with more counter columns as daily-limited features grow.
public sealed class UserDailyUsageEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly UsageDate { get; set; }
    public int PlaidResyncCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
