namespace TrueSpend.Domain.Entities.App;

public sealed class OnboardingStateEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short CurrentStepId { get; set; }
    public bool CardConnectionPlaid { get; set; }
    public bool CardConnectionManual { get; set; }
    public bool CardConnectionSkipped { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
