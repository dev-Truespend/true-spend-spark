using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Lookup;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

internal static class LookupColumnHelper
{
    public static void ConfigureCodeLookup<T>(EntityTypeBuilder<T> builder, string table) where T : class
    {
        builder.ToTable(table, "lookup");
        builder.HasKey("Id");
        builder.Property("Id").HasColumnName("id");
        builder.Property("Code").HasColumnName("code");
        builder.Property("DisplayName").HasColumnName("display_name");
        builder.Property("CreatedAt").HasColumnName("created_at");
        builder.HasIndex("Code").IsUnique();
    }
}

public sealed class CurrencyEntityConfiguration : IEntityTypeConfiguration<CurrencyEntity>
{
    public void Configure(EntityTypeBuilder<CurrencyEntity> builder)
    {
        builder.ToTable("currencies", "lookup");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(3);
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Symbol).HasColumnName("symbol");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class OnboardingStepEntityConfiguration : IEntityTypeConfiguration<OnboardingStepEntity>
{
    public void Configure(EntityTypeBuilder<OnboardingStepEntity> builder)
    {
        builder.ToTable("onboarding_steps", "lookup");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class PermissionStateEntityConfiguration : IEntityTypeConfiguration<PermissionStateEntity>
{
    public void Configure(EntityTypeBuilder<PermissionStateEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "permission_states");
}

public sealed class DevicePlatformEntityConfiguration : IEntityTypeConfiguration<DevicePlatformEntity>
{
    public void Configure(EntityTypeBuilder<DevicePlatformEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "device_platforms");
}

public sealed class RoleEntityConfiguration : IEntityTypeConfiguration<RoleEntity>
{
    public void Configure(EntityTypeBuilder<RoleEntity> builder)
    {
        builder.ToTable("roles", "lookup");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class CardNetworkEntityConfiguration : IEntityTypeConfiguration<CardNetworkEntity>
{
    public void Configure(EntityTypeBuilder<CardNetworkEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "card_networks");
}

public sealed class RewardCurrencyEntityConfiguration : IEntityTypeConfiguration<RewardCurrencyEntity>
{
    public void Configure(EntityTypeBuilder<RewardCurrencyEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "reward_currencies");
}

public sealed class PlaidItemStatusEntityConfiguration : IEntityTypeConfiguration<PlaidItemStatusEntity>
{
    public void Configure(EntityTypeBuilder<PlaidItemStatusEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "plaid_item_statuses");
}

public sealed class CardSourceEntityConfiguration : IEntityTypeConfiguration<CardSourceEntity>
{
    public void Configure(EntityTypeBuilder<CardSourceEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "card_sources");
}

public sealed class PeriodEntityConfiguration : IEntityTypeConfiguration<PeriodEntity>
{
    public void Configure(EntityTypeBuilder<PeriodEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "periods");
}

public sealed class SubscriptionStatusEntityConfiguration : IEntityTypeConfiguration<SubscriptionStatusEntity>
{
    public void Configure(EntityTypeBuilder<SubscriptionStatusEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "subscription_statuses");
}

public sealed class RecommendationContextEntityConfiguration : IEntityTypeConfiguration<RecommendationContextEntity>
{
    public void Configure(EntityTypeBuilder<RecommendationContextEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "recommendation_contexts");
}

public sealed class LocationEventTypeEntityConfiguration : IEntityTypeConfiguration<LocationEventTypeEntity>
{
    public void Configure(EntityTypeBuilder<LocationEventTypeEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "location_event_types");
}

public sealed class EventOutboxStatusEntityConfiguration : IEntityTypeConfiguration<EventOutboxStatusEntity>
{
    public void Configure(EntityTypeBuilder<EventOutboxStatusEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "event_outbox_statuses");
}

public sealed class EventDeliveryStatusEntityConfiguration : IEntityTypeConfiguration<EventDeliveryStatusEntity>
{
    public void Configure(EntityTypeBuilder<EventDeliveryStatusEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "event_delivery_statuses");
}

public sealed class AnalyticsPeriodEntityConfiguration : IEntityTypeConfiguration<AnalyticsPeriodEntity>
{
    public void Configure(EntityTypeBuilder<AnalyticsPeriodEntity> builder)
    {
        builder.ToTable("analytics_periods", "lookup");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class GenerationStatusEntityConfiguration : IEntityTypeConfiguration<GenerationStatusEntity>
{
    public void Configure(EntityTypeBuilder<GenerationStatusEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "generation_statuses");
}

public sealed class AIInsightTypeEntityConfiguration : IEntityTypeConfiguration<AIInsightTypeEntity>
{
    public void Configure(EntityTypeBuilder<AIInsightTypeEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "ai_insight_types");
}

public sealed class PriorityLevelEntityConfiguration : IEntityTypeConfiguration<PriorityLevelEntity>
{
    public void Configure(EntityTypeBuilder<PriorityLevelEntity> builder)
    {
        builder.ToTable("priority_levels", "lookup");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.SortOrder).HasColumnName("sort_order");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class NotificationChannelEntityConfiguration : IEntityTypeConfiguration<NotificationChannelEntity>
{
    public void Configure(EntityTypeBuilder<NotificationChannelEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "notification_channels");
}

public sealed class DeliveryStatusEntityConfiguration : IEntityTypeConfiguration<DeliveryStatusEntity>
{
    public void Configure(EntityTypeBuilder<DeliveryStatusEntity> builder)
    {
        builder.ToTable("delivery_statuses", "lookup");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.IsTerminal).HasColumnName("is_terminal");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class CapPeriodEntityConfiguration : IEntityTypeConfiguration<CapPeriodEntity>
{
    public void Configure(EntityTypeBuilder<CapPeriodEntity> builder) => LookupColumnHelper.ConfigureCodeLookup(builder, "cap_periods");
}
