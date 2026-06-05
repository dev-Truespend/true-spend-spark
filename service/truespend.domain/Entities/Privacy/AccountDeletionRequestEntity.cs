namespace TrueSpend.Domain.Entities.Privacy;

public sealed class AccountDeletionRequestEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = "pending";
    public DateTimeOffset RequestedAt { get; set; }
    public DateTimeOffset PurgeAfter { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public string? LastError { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
