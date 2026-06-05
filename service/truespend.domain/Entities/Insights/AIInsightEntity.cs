namespace TrueSpend.Domain.Entities.Insights;

public sealed class AIInsightEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public int GenerationRunId { get; set; }
    public short InsightTypeId { get; set; }
    public short PriorityId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsDismissed { get; set; }
    public DateTimeOffset? DismissedAt { get; set; }
    public DateTimeOffset GeneratedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
