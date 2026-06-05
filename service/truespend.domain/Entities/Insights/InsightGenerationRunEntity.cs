namespace TrueSpend.Domain.Entities.Insights;

public sealed class InsightGenerationRunEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short StatusId { get; set; }
    public string PromptVersion { get; set; } = string.Empty;
    public string? ModelName { get; set; }
    public int? InputTokenCount { get; set; }
    public int? OutputTokenCount { get; set; }
    public decimal? CostEstimate { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
