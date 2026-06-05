namespace TrueSpend.Domain.Entities.Privacy;

public sealed class PrivacySettingsEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public bool AnonymousAnalyticsEnabled { get; set; } = true;
    public bool PersonalizedAIInsightsEnabled { get; set; } = true;
    public bool LocationHistoryEnabled { get; set; } = true;
    public bool DataSharingForImprovementEnabled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
