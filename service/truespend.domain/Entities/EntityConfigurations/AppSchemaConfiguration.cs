using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.App;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class ProfileEntityConfiguration : IEntityTypeConfiguration<ProfileEntity>
{
    public void Configure(EntityTypeBuilder<ProfileEntity> builder)
    {
        builder.ToTable("profiles", "app");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Email).HasColumnName("email");
        builder.Property(x => x.Phone).HasColumnName("phone");
        builder.Property(x => x.AvatarUrl).HasColumnName("avatar_url");
        builder.Property(x => x.CountryId).HasColumnName("country_id");
        builder.Property(x => x.CurrencyId).HasColumnName("currency_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
    }
}

public sealed class OnboardingStateEntityConfiguration : IEntityTypeConfiguration<OnboardingStateEntity>
{
    public void Configure(EntityTypeBuilder<OnboardingStateEntity> builder)
    {
        builder.ToTable("onboarding_states", "app");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.CurrentStepId).HasColumnName("current_step_id");
        builder.Property(x => x.CardConnectionPlaid).HasColumnName("card_connection_plaid");
        builder.Property(x => x.CardConnectionManual).HasColumnName("card_connection_manual");
        builder.Property(x => x.CardConnectionSkipped).HasColumnName("card_connection_skipped");
        builder.Property(x => x.CompletedAt).HasColumnName("completed_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
    }
}

public sealed class UserPreferenceEntityConfiguration : IEntityTypeConfiguration<UserPreferenceEntity>
{
    public void Configure(EntityTypeBuilder<UserPreferenceEntity> builder)
    {
        builder.ToTable("user_preferences", "app");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Theme).HasColumnName("theme");
        builder.Property(x => x.Locale).HasColumnName("locale");
        builder.Property(x => x.Timezone).HasColumnName("timezone");
        builder.Property(x => x.HideAmounts).HasColumnName("hide_amounts");
        builder.Property(x => x.BiometricUnlockEnabled).HasColumnName("biometric_unlock_enabled");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
    }
}

public sealed class UserPermissionEntityConfiguration : IEntityTypeConfiguration<UserPermissionEntity>
{
    public void Configure(EntityTypeBuilder<UserPermissionEntity> builder)
    {
        builder.ToTable("user_permissions", "app");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.LocationPermissionId).HasColumnName("location_permission_id");
        builder.Property(x => x.CameraPermissionId).HasColumnName("camera_permission_id");
        builder.Property(x => x.NotificationPermissionId).HasColumnName("notification_permission_id");
        builder.Property(x => x.LastReportedAt).HasColumnName("last_reported_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
    }
}

public sealed class UserDailyUsageEntityConfiguration : IEntityTypeConfiguration<UserDailyUsageEntity>
{
    public void Configure(EntityTypeBuilder<UserDailyUsageEntity> builder)
    {
        builder.ToTable("user_daily_usage", "app");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.UsageDate).HasColumnName("usage_date");
        builder.Property(x => x.PlaidResyncCount).HasColumnName("plaid_resync_count");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.UserId, x.UsageDate }).IsUnique();
    }
}

public sealed class UserDevicePermissionEntityConfiguration : IEntityTypeConfiguration<UserDevicePermissionEntity>
{
    public void Configure(EntityTypeBuilder<UserDevicePermissionEntity> builder)
    {
        builder.ToTable("user_device_permissions", "app");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.DeviceId).HasColumnName("device_id");
        builder.Property(x => x.LocationPermissionId).HasColumnName("location_permission_id");
        builder.Property(x => x.CameraPermissionId).HasColumnName("camera_permission_id");
        builder.Property(x => x.NotificationPermissionId).HasColumnName("notification_permission_id");
        builder.Property(x => x.LocationAccuracy).HasColumnName("location_accuracy");
        builder.Property(x => x.RawPlatformPayload).HasColumnName("raw_platform_payload").HasColumnType("jsonb");
        builder.Property(x => x.LastReportedAt).HasColumnName("last_reported_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.UserId, x.DeviceId }).IsUnique();
    }
}
