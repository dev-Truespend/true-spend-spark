using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Insights;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class AnalyticsSnapshotEntityConfiguration : IEntityTypeConfiguration<AnalyticsSnapshotEntity>
{
    public void Configure(EntityTypeBuilder<AnalyticsSnapshotEntity> builder)
    {
        builder.ToTable("analytics_snapshots", "insights");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.PeriodId).HasColumnName("period_id");
        builder.Property(x => x.PeriodStart).HasColumnName("period_start");
        builder.Property(x => x.PeriodEnd).HasColumnName("period_end");
        builder.Property(x => x.EarnedAmount).HasColumnName("earned_amount").HasPrecision(12, 4);
        builder.Property(x => x.EarnedCurrencyCode).HasColumnName("earned_currency_code");
        builder.Property(x => x.MissedAmount).HasColumnName("missed_amount").HasPrecision(12, 4);
        builder.Property(x => x.PriorEarnedAmount).HasColumnName("prior_earned_amount").HasPrecision(12, 4);
        builder.Property(x => x.PriorMissedAmount).HasColumnName("prior_missed_amount").HasPrecision(12, 4);
        builder.Property(x => x.DailyBreakdown).HasColumnName("daily_breakdown").HasColumnType("jsonb");
        builder.Property(x => x.CategoryBreakdown).HasColumnName("category_breakdown").HasColumnType("jsonb");
        builder.Property(x => x.ComputedAt).HasColumnName("computed_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => new { x.UserId, x.PeriodId, x.PeriodStart }).IsUnique();
    }
}

public sealed class InsightGenerationRunEntityConfiguration : IEntityTypeConfiguration<InsightGenerationRunEntity>
{
    public void Configure(EntityTypeBuilder<InsightGenerationRunEntity> builder)
    {
        builder.ToTable("insight_generation_runs", "insights");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.StatusId).HasColumnName("status_id");
        builder.Property(x => x.PromptVersion).HasColumnName("prompt_version");
        builder.Property(x => x.ModelName).HasColumnName("model_name");
        builder.Property(x => x.InputTokenCount).HasColumnName("input_token_count");
        builder.Property(x => x.OutputTokenCount).HasColumnName("output_token_count");
        builder.Property(x => x.CostEstimate).HasColumnName("cost_estimate").HasPrecision(10, 6);
        builder.Property(x => x.ErrorMessage).HasColumnName("error_message");
        builder.Property(x => x.StartedAt).HasColumnName("started_at");
        builder.Property(x => x.CompletedAt).HasColumnName("completed_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.StatusId);
    }
}

public sealed class AIInsightEntityConfiguration : IEntityTypeConfiguration<AIInsightEntity>
{
    public void Configure(EntityTypeBuilder<AIInsightEntity> builder)
    {
        builder.ToTable("ai_insights", "insights");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.GenerationRunId).HasColumnName("generation_run_id");
        builder.Property(x => x.InsightTypeId).HasColumnName("insight_type_id");
        builder.Property(x => x.PriorityId).HasColumnName("priority_id");
        builder.Property(x => x.Title).HasColumnName("title");
        builder.Property(x => x.Body).HasColumnName("body");
        builder.Property(x => x.IsDismissed).HasColumnName("is_dismissed");
        builder.Property(x => x.DismissedAt).HasColumnName("dismissed_at");
        builder.Property(x => x.GeneratedAt).HasColumnName("generated_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => new { x.UserId, x.IsDismissed });
    }
}
