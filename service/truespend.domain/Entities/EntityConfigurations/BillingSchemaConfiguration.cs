using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Billing;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class CountryEntityConfiguration : IEntityTypeConfiguration<CountryEntity>
{
    public void Configure(EntityTypeBuilder<CountryEntity> builder)
    {
        builder.ToTable("countries", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code").HasMaxLength(2);
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.CurrencyId).HasColumnName("currency_id");
        builder.Property(x => x.IsSupported).HasColumnName("is_supported");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class PlanEntityConfiguration : IEntityTypeConfiguration<PlanEntity>
{
    public void Configure(EntityTypeBuilder<PlanEntity> builder)
    {
        builder.ToTable("plans", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.TrialDays).HasColumnName("trial_days");
        builder.Property(x => x.StripeProductId).HasColumnName("stripe_product_id");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class PlanPriceEntityConfiguration : IEntityTypeConfiguration<PlanPriceEntity>
{
    public void Configure(EntityTypeBuilder<PlanPriceEntity> builder)
    {
        builder.ToTable("plan_prices", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.CountryId).HasColumnName("country_id");
        builder.Property(x => x.PeriodId).HasColumnName("period_id");
        builder.Property(x => x.Price).HasColumnName("price").HasPrecision(10, 2);
        builder.Property(x => x.StripePriceId).HasColumnName("stripe_price_id");
        builder.Property(x => x.EffectiveFrom).HasColumnName("effective_from");
        builder.Property(x => x.EffectiveTo).HasColumnName("effective_to");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.PlanId, x.CountryId, x.PeriodId, x.EffectiveFrom }).IsUnique();
    }
}

public sealed class FeatureEntityConfiguration : IEntityTypeConfiguration<FeatureEntity>
{
    public void Configure(EntityTypeBuilder<FeatureEntity> builder)
    {
        builder.ToTable("features", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.ValueType).HasColumnName("value_type");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class PlanFeatureEntityConfiguration : IEntityTypeConfiguration<PlanFeatureEntity>
{
    public void Configure(EntityTypeBuilder<PlanFeatureEntity> builder)
    {
        builder.ToTable("plan_features", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.FeatureId).HasColumnName("feature_id");
        builder.Property(x => x.Value).HasColumnName("value");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.PlanId, x.FeatureId }).IsUnique();
    }
}

public sealed class StripeCustomerEntityConfiguration : IEntityTypeConfiguration<StripeCustomerEntity>
{
    public void Configure(EntityTypeBuilder<StripeCustomerEntity> builder)
    {
        builder.ToTable("stripe_customers", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.StripeCustomerId).HasColumnName("stripe_customer_id");
        builder.Property(x => x.Email).HasColumnName("email");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId).IsUnique();
        builder.HasIndex(x => x.StripeCustomerId).IsUnique();
    }
}

public sealed class SubscriptionEntityConfiguration : IEntityTypeConfiguration<SubscriptionEntity>
{
    public void Configure(EntityTypeBuilder<SubscriptionEntity> builder)
    {
        builder.ToTable("subscriptions", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.PlanId).HasColumnName("plan_id");
        builder.Property(x => x.PlanPriceId).HasColumnName("plan_price_id");
        builder.Property(x => x.StripeSubscriptionId).HasColumnName("stripe_subscription_id");
        builder.Property(x => x.StatusId).HasColumnName("status_id");
        builder.Property(x => x.CurrentPeriodStart).HasColumnName("current_period_start");
        builder.Property(x => x.CurrentPeriodEnd).HasColumnName("current_period_end");
        builder.Property(x => x.TrialEnd).HasColumnName("trial_end");
        builder.Property(x => x.CancelAtPeriodEnd).HasColumnName("cancel_at_period_end");
        builder.Property(x => x.CanceledAt).HasColumnName("canceled_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.StripeSubscriptionId).IsUnique();
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class PaymentMethodEntityConfiguration : IEntityTypeConfiguration<PaymentMethodEntity>
{
    public void Configure(EntityTypeBuilder<PaymentMethodEntity> builder)
    {
        builder.ToTable("payment_methods", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.StripeCustomerId).HasColumnName("stripe_customer_id");
        builder.Property(x => x.StripePaymentMethodId).HasColumnName("stripe_payment_method_id");
        builder.Property(x => x.Brand).HasColumnName("brand");
        builder.Property(x => x.LastFour).HasColumnName("last_four");
        builder.Property(x => x.ExpMonth).HasColumnName("exp_month");
        builder.Property(x => x.ExpYear).HasColumnName("exp_year");
        builder.Property(x => x.IsDefault).HasColumnName("is_default");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.StripePaymentMethodId).IsUnique();
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class StripeWebhookEventEntityConfiguration : IEntityTypeConfiguration<StripeWebhookEventEntity>
{
    public void Configure(EntityTypeBuilder<StripeWebhookEventEntity> builder)
    {
        builder.ToTable("stripe_webhook_events", "billing");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.StripeEventId).HasColumnName("stripe_event_id");
        builder.Property(x => x.EventType).HasColumnName("event_type");
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.ReceivedAt).HasColumnName("received_at");
        builder.Property(x => x.ProcessedAt).HasColumnName("processed_at");
        builder.Property(x => x.ProcessingError).HasColumnName("processing_error");
        builder.HasIndex(x => x.StripeEventId).IsUnique();
        builder.HasIndex(x => x.EventType);
    }
}
