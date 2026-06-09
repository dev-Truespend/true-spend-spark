using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Finance;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class PlaidItemEntityConfiguration : IEntityTypeConfiguration<PlaidItemEntity>
{
    public void Configure(EntityTypeBuilder<PlaidItemEntity> builder)
    {
        builder.ToTable("plaid_items", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.PlaidItemId).HasColumnName("plaid_item_id");
        builder.Property(x => x.PlaidInstitutionId).HasColumnName("plaid_institution_id");
        builder.Property(x => x.InstitutionName).HasColumnName("institution_name");
        builder.Property(x => x.InstitutionLogoUrl).HasColumnName("institution_logo_url");
        builder.Property(x => x.AccessTokenEncrypted).HasColumnName("access_token_encrypted");
        builder.Property(x => x.StatusId).HasColumnName("status_id");
        builder.Property(x => x.LastSyncAt).HasColumnName("last_sync_at");
        builder.Property(x => x.TransactionSyncCursor).HasColumnName("transaction_sync_cursor");
        builder.Property(x => x.LastTransactionSyncAt).HasColumnName("last_transaction_sync_at");
        builder.Property(x => x.LastError).HasColumnName("last_error");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.PlaidItemId).IsUnique();
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class PlaidAccountEntityConfiguration : IEntityTypeConfiguration<PlaidAccountEntity>
{
    public void Configure(EntityTypeBuilder<PlaidAccountEntity> builder)
    {
        builder.ToTable("plaid_accounts", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PlaidItemId).HasColumnName("plaid_item_id");
        builder.Property(x => x.PlaidAccountId).HasColumnName("plaid_account_id");
        builder.Property(x => x.AccountName).HasColumnName("account_name");
        builder.Property(x => x.Mask).HasColumnName("mask");
        builder.Property(x => x.Subtype).HasColumnName("subtype");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.PlaidAccountId).IsUnique();
    }
}

public sealed class UserCardEntityConfiguration : IEntityTypeConfiguration<UserCardEntity>
{
    public void Configure(EntityTypeBuilder<UserCardEntity> builder)
    {
        builder.ToTable("user_cards", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.CardProductId).HasColumnName("card_product_id");
        builder.Property(x => x.CatalogRequestId).HasColumnName("catalog_request_id");
        builder.Property(x => x.PlaidAccountId).HasColumnName("plaid_account_id");
        builder.Property(x => x.SourceId).HasColumnName("source_id");
        builder.Property(x => x.SyncStatus).HasColumnName("sync_status");
        builder.Property(x => x.CustomIssuerName).HasColumnName("custom_issuer_name");
        builder.Property(x => x.CustomCardName).HasColumnName("custom_card_name");
        builder.Property(x => x.Nickname).HasColumnName("nickname");
        builder.Property(x => x.LastFour).HasColumnName("last_four");
        builder.Property(x => x.IsPrimary).HasColumnName("is_primary");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class CardRewardOverrideEntityConfiguration : IEntityTypeConfiguration<CardRewardOverrideEntity>
{
    public void Configure(EntityTypeBuilder<CardRewardOverrideEntity> builder)
    {
        builder.ToTable("card_reward_overrides", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserCardId).HasColumnName("user_card_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Multiplier).HasColumnName("multiplier").HasPrecision(6, 4);
        builder.Property(x => x.Notes).HasColumnName("notes");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserCardId);
    }
}

public sealed class MerchantEntityConfiguration : IEntityTypeConfiguration<MerchantEntity>
{
    public void Configure(EntityTypeBuilder<MerchantEntity> builder)
    {
        builder.ToTable("merchants", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.CanonicalName).HasColumnName("canonical_name");
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.MapkitPlaceId).HasColumnName("mapkit_place_id");
        builder.Property(x => x.GooglePlaceId).HasColumnName("google_place_id");
        builder.Property(x => x.Lat).HasColumnName("lat");
        builder.Property(x => x.Lng).HasColumnName("lng");
        builder.Property(x => x.Address).HasColumnName("address");
        builder.Property(x => x.IsMultiCategory).HasColumnName("is_multi_category");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.NormalizedName);
    }
}

public sealed class MerchantVisitEntityConfiguration : IEntityTypeConfiguration<MerchantVisitEntity>
{
    public void Configure(EntityTypeBuilder<MerchantVisitEntity> builder)
    {
        builder.ToTable("merchant_visits", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.MerchantId).HasColumnName("merchant_id");
        builder.Property(x => x.SelectedCategoryId).HasColumnName("selected_category_id");
        builder.Property(x => x.VisitedAt).HasColumnName("visited_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class RecommendationEntityConfiguration : IEntityTypeConfiguration<RecommendationEntity>
{
    public void Configure(EntityTypeBuilder<RecommendationEntity> builder)
    {
        builder.ToTable("recommendations", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.MerchantId).HasColumnName("merchant_id");
        builder.Property(x => x.RecommendedUserCardId).HasColumnName("recommended_user_card_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.ExpectedRewardRate).HasColumnName("expected_reward_rate").HasPrecision(6, 4);
        builder.Property(x => x.ExpectedRewardAmount).HasColumnName("expected_reward_amount").HasPrecision(10, 2);
        builder.Property(x => x.ContextId).HasColumnName("context_id");
        builder.Property(x => x.GeneratedAt).HasColumnName("generated_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class TransactionEntityConfiguration : IEntityTypeConfiguration<TransactionEntity>
{
    public void Configure(EntityTypeBuilder<TransactionEntity> builder)
    {
        builder.ToTable("transactions", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Source).HasColumnName("source");
        builder.Property(x => x.PlaidTransactionId).HasColumnName("plaid_transaction_id");
        builder.Property(x => x.PlaidAccountId).HasColumnName("plaid_account_id");
        builder.Property(x => x.UserCardId).HasColumnName("user_card_id");
        builder.Property(x => x.MerchantId).HasColumnName("merchant_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.TransactionCategoryId).HasColumnName("transaction_category_id");
        builder.Property(x => x.PlaidConfidenceLevel).HasColumnName("plaid_confidence_level");
        builder.Property(x => x.Amount).HasColumnName("amount").HasPrecision(12, 2);
        builder.Property(x => x.TransactionDate).HasColumnName("transaction_date");
        builder.Property(x => x.TransactionTime).HasColumnName("transaction_time");
        builder.Property(x => x.IsPending).HasColumnName("is_pending");
        builder.Property(x => x.Description).HasColumnName("description");
        builder.Property(x => x.LocationLabel).HasColumnName("location_label");
        builder.Property(x => x.LocationLat).HasColumnName("location_lat");
        builder.Property(x => x.LocationLng).HasColumnName("location_lng");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.PlaidTransactionId).IsUnique().HasFilter("plaid_transaction_id IS NOT NULL");
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.UserCardId);
        builder.HasIndex(x => x.TransactionCategoryId);
    }
}

public sealed class TransactionCategoryEntityConfiguration : IEntityTypeConfiguration<TransactionCategoryEntity>
{
    public void Configure(EntityTypeBuilder<TransactionCategoryEntity> builder)
    {
        builder.ToTable("transaction_categories", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.ParentId).HasColumnName("parent_id");
        builder.Property(x => x.IsPrimary).HasColumnName("is_primary");
        builder.Property(x => x.IsOutflow).HasColumnName("is_outflow");
        builder.Property(x => x.Icon).HasColumnName("icon");
        builder.Property(x => x.DisplayOrder).HasColumnName("display_order");
        builder.Property(x => x.Source).HasColumnName("source");
        builder.Property(x => x.SourceVersion).HasColumnName("source_version");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.ParentId);
    }
}

public sealed class TransactionCategoryBridgeEntityConfiguration : IEntityTypeConfiguration<TransactionCategoryBridgeEntity>
{
    public void Configure(EntityTypeBuilder<TransactionCategoryBridgeEntity> builder)
    {
        builder.ToTable("transaction_category_bridge", "finance");
        builder.HasKey(x => x.TransactionCategoryId);
        builder.Property(x => x.TransactionCategoryId).HasColumnName("transaction_category_id").ValueGeneratedNever();
        builder.Property(x => x.SubcategoryGroup).HasColumnName("subcategory_group");
        builder.Property(x => x.Notes).HasColumnName("notes");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.SubcategoryGroup);
    }
}

public sealed class TransactionRewardResultEntityConfiguration : IEntityTypeConfiguration<TransactionRewardResultEntity>
{
    public void Configure(EntityTypeBuilder<TransactionRewardResultEntity> builder)
    {
        builder.ToTable("transaction_reward_results", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TransactionId).HasColumnName("transaction_id");
        builder.Property(x => x.EarnedRate).HasColumnName("earned_rate").HasPrecision(6, 4);
        builder.Property(x => x.EarnedAmount).HasColumnName("earned_amount").HasPrecision(12, 4);
        builder.Property(x => x.RewardCurrencyId).HasColumnName("reward_currency_id");
        builder.Property(x => x.RuleAppliedId).HasColumnName("rule_applied_id");
        builder.Property(x => x.ComputedAt).HasColumnName("computed_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.TransactionId).IsUnique();
    }
}

public sealed class FoursquareWebhookEventEntityConfiguration : IEntityTypeConfiguration<FoursquareWebhookEventEntity>
{
    public void Configure(EntityTypeBuilder<FoursquareWebhookEventEntity> builder)
    {
        builder.ToTable("foursquare_webhook_events", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.FoursquareEventId).HasColumnName("foursquare_event_id");
        builder.Property(x => x.EventType).HasColumnName("event_type");
        builder.Property(x => x.FoursquareUserId).HasColumnName("foursquare_user_id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.MerchantId).HasColumnName("merchant_id");
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.ReceivedAt).HasColumnName("received_at");
        builder.Property(x => x.ProcessedAt).HasColumnName("processed_at");
        builder.Property(x => x.ProcessingError).HasColumnName("processing_error");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.FoursquareEventId).IsUnique();
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => x.EventType);
    }
}

public sealed class PlaidWebhookEventEntityConfiguration : IEntityTypeConfiguration<PlaidWebhookEventEntity>
{
    public void Configure(EntityTypeBuilder<PlaidWebhookEventEntity> builder)
    {
        builder.ToTable("plaid_webhook_events", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PlaidEventId).HasColumnName("plaid_event_id");
        builder.Property(x => x.WebhookType).HasColumnName("webhook_type");
        builder.Property(x => x.WebhookCode).HasColumnName("webhook_code");
        builder.Property(x => x.PlaidItemId).HasColumnName("plaid_item_id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Payload).HasColumnName("payload").HasColumnType("jsonb");
        builder.Property(x => x.ReceivedAt).HasColumnName("received_at");
        builder.Property(x => x.ProcessedAt).HasColumnName("processed_at");
        builder.Property(x => x.ProcessingError).HasColumnName("processing_error");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.PlaidEventId).IsUnique();
        builder.HasIndex(x => x.PlaidItemId);
        builder.HasIndex(x => x.UserId);
        builder.HasIndex(x => new { x.WebhookType, x.WebhookCode });
    }
}

public sealed class LocationEventEntityConfiguration : IEntityTypeConfiguration<LocationEventEntity>
{
    public void Configure(EntityTypeBuilder<LocationEventEntity> builder)
    {
        builder.ToTable("location_events", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.Lat).HasColumnName("lat");
        builder.Property(x => x.Lng).HasColumnName("lng");
        builder.Property(x => x.AccuracyMeters).HasColumnName("accuracy_meters");
        builder.Property(x => x.MerchantId).HasColumnName("merchant_id");
        builder.Property(x => x.EventTypeId).HasColumnName("event_type_id");
        builder.Property(x => x.OccurredAt).HasColumnName("occurred_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => new { x.UserId, x.OccurredAt });
    }
}

public sealed class MissedRewardEventEntityConfiguration : IEntityTypeConfiguration<MissedRewardEventEntity>
{
    public void Configure(EntityTypeBuilder<MissedRewardEventEntity> builder)
    {
        builder.ToTable("missed_reward_events", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.TransactionId).HasColumnName("transaction_id");
        builder.Property(x => x.BetterUserCardId).HasColumnName("better_user_card_id");
        builder.Property(x => x.ActualRewardAmount).HasColumnName("actual_reward_amount").HasPrecision(12, 4);
        builder.Property(x => x.PotentialRewardAmount).HasColumnName("potential_reward_amount").HasPrecision(12, 4);
        builder.Property(x => x.MissedAmount).HasColumnName("missed_amount").HasPrecision(12, 4);
        builder.Property(x => x.IsDismissed).HasColumnName("is_dismissed");
        builder.Property(x => x.DetectedAt).HasColumnName("detected_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.TransactionId).IsUnique();
    }
}

public sealed class PlaidInstitutionEntityConfiguration : IEntityTypeConfiguration<PlaidInstitutionEntity>
{
    public void Configure(EntityTypeBuilder<PlaidInstitutionEntity> builder)
    {
        builder.ToTable("plaid_institutions", "finance");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.PlaidInstitutionId).HasColumnName("plaid_institution_id");
        builder.Property(x => x.Name).HasColumnName("name");
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name");
        builder.Property(x => x.CountryCode).HasColumnName("country_code");
        builder.Property(x => x.LogoUrl).HasColumnName("logo_url");
        builder.Property(x => x.PrimaryColor).HasColumnName("primary_color");
        builder.Property(x => x.Url).HasColumnName("url");
        builder.Property(x => x.Oauth).HasColumnName("oauth");
        builder.Property(x => x.Products).HasColumnName("products");
        builder.Property(x => x.RoutingNumbers).HasColumnName("routing_numbers");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.LastSyncedAt).HasColumnName("last_synced_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.PlaidInstitutionId).IsUnique();
        builder.HasIndex(x => x.NormalizedName);
        builder.HasIndex(x => x.CountryCode);
        builder.HasIndex(x => x.IsActive);
    }
}
