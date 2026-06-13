using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Messaging;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class DeviceEntityConfiguration : IEntityTypeConfiguration<DeviceEntity>
{
    public void Configure(EntityTypeBuilder<DeviceEntity> builder)
    {
        builder.ToTable("devices", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.PlatformId).HasColumnName("platform_id");
        builder.Property(x => x.PushToken).HasColumnName("push_token");
        builder.Property(x => x.InstallationId).HasColumnName("installation_id");
        builder.Property(x => x.DeviceName).HasColumnName("device_name");
        builder.Property(x => x.AppVersion).HasColumnName("app_version");
        builder.Property(x => x.OsVersion).HasColumnName("os_version");
        builder.Property(x => x.Locale).HasColumnName("locale");
        builder.Property(x => x.Timezone).HasColumnName("timezone");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.LastSeenAt).HasColumnName("last_seen_at");
        builder.Property(x => x.RegisteredAt).HasColumnName("registered_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.PushToken).IsUnique();
        builder.HasIndex(x => new { x.UserId, x.InstallationId });
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class NotificationPreferenceEntityConfiguration : IEntityTypeConfiguration<NotificationPreferenceEntity>
{
    public void Configure(EntityTypeBuilder<NotificationPreferenceEntity> builder)
    {
        builder.ToTable("notification_preferences", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.MasterEnabled).HasColumnName("master_enabled");
        builder.Property(x => x.PushEnabled).HasColumnName("push_enabled");
        builder.Property(x => x.EmailEnabled).HasColumnName("email_enabled");
        builder.Property(x => x.QuietHoursEnabled).HasColumnName("quiet_hours_enabled");
        builder.Property(x => x.QuietHoursStart).HasColumnName("quiet_hours_start");
        builder.Property(x => x.QuietHoursEnd).HasColumnName("quiet_hours_end");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
    }
}

public sealed class NotificationTypeEntityConfiguration : IEntityTypeConfiguration<NotificationTypeEntity>
{
    public void Configure(EntityTypeBuilder<NotificationTypeEntity> builder)
    {
        builder.ToTable("notification_types", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.DefaultEnabled).HasColumnName("default_enabled");
        builder.Property(x => x.HonorsQuietHours).HasColumnName("honors_quiet_hours");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class NotificationTypePreferenceEntityConfiguration : IEntityTypeConfiguration<NotificationTypePreferenceEntity>
{
    public void Configure(EntityTypeBuilder<NotificationTypePreferenceEntity> builder)
    {
        builder.ToTable("notification_type_preferences", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.NotificationTypeId).HasColumnName("notification_type_id");
        builder.Property(x => x.IsEnabled).HasColumnName("is_enabled");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.UserId, x.NotificationTypeId }).IsUnique();
    }
}

public sealed class NotificationEntityConfiguration : IEntityTypeConfiguration<NotificationEntity>
{
    public void Configure(EntityTypeBuilder<NotificationEntity> builder)
    {
        builder.ToTable("notifications", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.NotificationTypeId).HasColumnName("notification_type_id");
        builder.Property(x => x.Title).HasColumnName("title");
        builder.Property(x => x.Body).HasColumnName("body");
        builder.Property(x => x.RelatedTransactionId).HasColumnName("related_transaction_id");
        builder.Property(x => x.RelatedMissedRewardEventId).HasColumnName("related_missed_reward_event_id");
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.IsRead).HasColumnName("is_read");
        builder.Property(x => x.ReadAt).HasColumnName("read_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
        builder.HasOne(x => x.NotificationType).WithMany().HasForeignKey(x => x.NotificationTypeId);
    }
}

public sealed class NotificationReminderEntityConfiguration : IEntityTypeConfiguration<NotificationReminderEntity>
{
    public void Configure(EntityTypeBuilder<NotificationReminderEntity> builder)
    {
        builder.ToTable("notification_reminders", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.SourceNotificationId).HasColumnName("source_notification_id");
        builder.Property(x => x.RemindAt).HasColumnName("remind_at");
        builder.Property(x => x.Title).HasColumnName("title");
        builder.Property(x => x.Body).HasColumnName("body");
        builder.Property(x => x.IsFired).HasColumnName("is_fired");
        builder.Property(x => x.FiredAt).HasColumnName("fired_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class NotificationDeliveryEntityConfiguration : IEntityTypeConfiguration<NotificationDeliveryEntity>
{
    public void Configure(EntityTypeBuilder<NotificationDeliveryEntity> builder)
    {
        builder.ToTable("notification_deliveries", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.NotificationId).HasColumnName("notification_id");
        builder.Property(x => x.DeviceId).HasColumnName("device_id");
        builder.Property(x => x.ChannelId).HasColumnName("channel_id");
        builder.Property(x => x.StatusId).HasColumnName("status_id");
        builder.Property(x => x.ExternalId).HasColumnName("external_id");
        builder.Property(x => x.ErrorCode).HasColumnName("error_code");
        builder.Property(x => x.ErrorMessage).HasColumnName("error_message");
        builder.Property(x => x.AttemptedAt).HasColumnName("attempted_at");
        builder.Property(x => x.DeliveredAt).HasColumnName("delivered_at");
        builder.Property(x => x.NextAttemptAt).HasColumnName("next_attempt_at");
        builder.Property(x => x.AttemptCount).HasColumnName("attempt_count");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.NotificationId);
    }
}

public sealed class EventOutboxEntityConfiguration : IEntityTypeConfiguration<EventOutboxEntity>
{
    public void Configure(EntityTypeBuilder<EventOutboxEntity> builder)
    {
        builder.ToTable("event_outbox", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EventType).HasColumnName("event_type");
        builder.Property(x => x.AggregateType).HasColumnName("aggregate_type");
        builder.Property(x => x.AggregateId).HasColumnName("aggregate_id");
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.IdempotencyKey).HasColumnName("idempotency_key");
        builder.Property(x => x.StatusId).HasColumnName("status_id");
        builder.Property(x => x.AvailableAt).HasColumnName("available_at");
        builder.Property(x => x.DispatchedAt).HasColumnName("dispatched_at");
        builder.Property(x => x.SucceededAt).HasColumnName("succeeded_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.EventType, x.IdempotencyKey }).IsUnique();
    }
}

public sealed class EventSubscriptionEntityConfiguration : IEntityTypeConfiguration<EventSubscriptionEntity>
{
    public void Configure(EntityTypeBuilder<EventSubscriptionEntity> builder)
    {
        builder.ToTable("event_subscriptions", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EventType).HasColumnName("event_type");
        builder.Property(x => x.ConsumerName).HasColumnName("consumer_name");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.MaxRetries).HasColumnName("max_retries");
        builder.Property(x => x.RetryBackoffSeconds).HasColumnName("retry_backoff_seconds");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.EventType, x.ConsumerName }).IsUnique();
    }
}

public sealed class EventDeliveryEntityConfiguration : IEntityTypeConfiguration<EventDeliveryEntity>
{
    public void Configure(EntityTypeBuilder<EventDeliveryEntity> builder)
    {
        builder.ToTable("event_deliveries", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.EventOutboxId).HasColumnName("event_outbox_id");
        builder.Property(x => x.EventSubscriptionId).HasColumnName("event_subscription_id");
        builder.Property(x => x.StatusId).HasColumnName("status_id");
        builder.Property(x => x.AttemptCount).HasColumnName("attempt_count");
        builder.Property(x => x.NextAttemptAt).HasColumnName("next_attempt_at");
        builder.Property(x => x.LastError).HasColumnName("last_error");
        builder.Property(x => x.SucceededAt).HasColumnName("succeeded_at");
        builder.Property(x => x.DeadLetteredAt).HasColumnName("dead_lettered_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.EventOutboxId, x.EventSubscriptionId }).IsUnique();
    }
}

public sealed class AdminNotificationCampaignEntityConfiguration : IEntityTypeConfiguration<AdminNotificationCampaignEntity>
{
    public void Configure(EntityTypeBuilder<AdminNotificationCampaignEntity> builder)
    {
        builder.ToTable("admin_notification_campaigns", "messaging");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.NotificationTypeId).HasColumnName("notification_type_id");
        builder.Property(x => x.TitleTemplate).HasColumnName("title_template");
        builder.Property(x => x.BodyTemplate).HasColumnName("body_template");
        builder.Property(x => x.TemplateData).HasColumnName("template_data").HasColumnType("jsonb");
        builder.Property(x => x.AudienceSelector).HasColumnName("audience_selector").HasColumnType("jsonb");
        builder.Property(x => x.ScheduledFor).HasColumnName("scheduled_for");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.AudienceCursor).HasColumnName("audience_cursor");
        builder.Property(x => x.IdempotencyKey).HasColumnName("idempotency_key");
        builder.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");
        builder.Property(x => x.TotalRecipients).HasColumnName("total_recipients");
        builder.Property(x => x.NotificationsCreated).HasColumnName("notifications_created");
        builder.Property(x => x.GatedOut).HasColumnName("gated_out");
        builder.Property(x => x.Failed).HasColumnName("failed");
        builder.Property(x => x.LastProcessedAt).HasColumnName("last_processed_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.IdempotencyKey).IsUnique();
    }
}
