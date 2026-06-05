using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Privacy;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class PrivacySettingsEntityConfiguration : IEntityTypeConfiguration<PrivacySettingsEntity>
{
    public void Configure(EntityTypeBuilder<PrivacySettingsEntity> builder)
    {
        builder.ToTable("settings", "privacy");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.AnonymousAnalyticsEnabled).HasColumnName("anonymous_analytics_enabled");
        builder.Property(x => x.PersonalizedAIInsightsEnabled).HasColumnName("personalized_ai_insights_enabled");
        builder.Property(x => x.LocationHistoryEnabled).HasColumnName("location_history_enabled");
        builder.Property(x => x.DataSharingForImprovementEnabled).HasColumnName("data_sharing_for_improvement_enabled");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
    }
}

public sealed class AccountDeletionRequestEntityConfiguration : IEntityTypeConfiguration<AccountDeletionRequestEntity>
{
    public void Configure(EntityTypeBuilder<AccountDeletionRequestEntity> builder)
    {
        builder.ToTable("account_deletion_requests", "privacy");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.RequestedAt).HasColumnName("requested_at");
        builder.Property(x => x.PurgeAfter).HasColumnName("purge_after");
        builder.Property(x => x.CancelledAt).HasColumnName("cancelled_at");
        builder.Property(x => x.CompletedAt).HasColumnName("completed_at");
        builder.Property(x => x.LastError).HasColumnName("last_error");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class PrivacyAuditEventEntityConfiguration : IEntityTypeConfiguration<PrivacyAuditEventEntity>
{
    public void Configure(EntityTypeBuilder<PrivacyAuditEventEntity> builder)
    {
        builder.ToTable("audit_events", "privacy");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.EventType).HasColumnName("event_type");
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
    }
}
