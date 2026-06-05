using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Catalog;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class CardIssuerEntityConfiguration : IEntityTypeConfiguration<CardIssuerEntity>
{
    public void Configure(EntityTypeBuilder<CardIssuerEntity> builder)
    {
        builder.ToTable("card_issuers", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.LogoUrl).HasColumnName("logo_url");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.RewardsCcId).HasColumnName("rewardscc_id");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class CardProductEntityConfiguration : IEntityTypeConfiguration<CardProductEntity>
{
    public void Configure(EntityTypeBuilder<CardProductEntity> builder)
    {
        builder.ToTable("card_products", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.IssuerId).HasColumnName("issuer_id");
        builder.Property(x => x.NetworkId).HasColumnName("network_id");
        builder.Property(x => x.RewardCurrencyId).HasColumnName("reward_currency_id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.CardArtUrl).HasColumnName("card_art_url");
        builder.Property(x => x.AnnualFee).HasColumnName("annual_fee").HasPrecision(10, 2);
        builder.Property(x => x.PurchaseApr).HasColumnName("purchase_apr");
        builder.Property(x => x.ForeignTransactionFee).HasColumnName("foreign_transaction_fee");
        builder.Property(x => x.TermsSummary).HasColumnName("terms_summary");
        builder.Property(x => x.RewardCurrencyName).HasColumnName("reward_currency_name");
        builder.Property(x => x.BaseRewardRate).HasColumnName("base_reward_rate").HasPrecision(6, 4);
        builder.Property(x => x.RewardsCcId).HasColumnName("rewardscc_id");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.IssuerId);
    }
}

public sealed class CardProductRequestEntityConfiguration : IEntityTypeConfiguration<CardProductRequestEntity>
{
    public void Configure(EntityTypeBuilder<CardProductRequestEntity> builder)
    {
        builder.ToTable("card_product_requests", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.IssuerName).HasColumnName("issuer_name");
        builder.Property(x => x.CardName).HasColumnName("card_name");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.ApprovedIssuerId).HasColumnName("approved_issuer_id");
        builder.Property(x => x.ApprovedCardProductId).HasColumnName("approved_card_product_id");
        builder.Property(x => x.ReviewedByUserId).HasColumnName("reviewed_by_user_id");
        builder.Property(x => x.ReviewedAt).HasColumnName("reviewed_at");
        builder.Property(x => x.ReviewNotes).HasColumnName("review_notes");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
    }
}

public sealed class CategoryEntityConfiguration : IEntityTypeConfiguration<CategoryEntity>
{
    public void Configure(EntityTypeBuilder<CategoryEntity> builder)
    {
        builder.ToTable("categories", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Code).HasColumnName("code");
        builder.Property(x => x.DisplayName).HasColumnName("display_name");
        builder.Property(x => x.Icon).HasColumnName("icon");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.Code).IsUnique();
    }
}

public sealed class CategoryAliasEntityConfiguration : IEntityTypeConfiguration<CategoryAliasEntity>
{
    public void Configure(EntityTypeBuilder<CategoryAliasEntity> builder)
    {
        builder.ToTable("category_aliases", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Alias).HasColumnName("alias");
        builder.Property(x => x.Source).HasColumnName("source");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.HasIndex(x => x.CategoryId);
    }
}

public sealed class RewardRuleEntityConfiguration : IEntityTypeConfiguration<RewardRuleEntity>
{
    public void Configure(EntityTypeBuilder<RewardRuleEntity> builder)
    {
        builder.ToTable("reward_rules", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.CardProductId).HasColumnName("card_product_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Multiplier).HasColumnName("multiplier").HasPrecision(6, 4);
        builder.Property(x => x.CapAmount).HasColumnName("cap_amount").HasPrecision(12, 2);
        builder.Property(x => x.CapPeriodId).HasColumnName("cap_period_id");
        builder.Property(x => x.StartDate).HasColumnName("start_date");
        builder.Property(x => x.EndDate).HasColumnName("end_date");
        builder.Property(x => x.RequiresActivation).HasColumnName("requires_activation");
        builder.Property(x => x.Notes).HasColumnName("notes");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.CardProductId);
    }
}

public sealed class CardProductReviewItemEntityConfiguration : IEntityTypeConfiguration<CardProductReviewItemEntity>
{
    public void Configure(EntityTypeBuilder<CardProductReviewItemEntity> builder)
    {
        builder.ToTable("card_product_review_items", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Provider).HasColumnName("provider");
        builder.Property(x => x.ProviderCardId).HasColumnName("provider_card_id");
        builder.Property(x => x.ReasonCode).HasColumnName("reason_code");
        builder.Property(x => x.Confidence).HasColumnName("confidence").HasPrecision(4, 3);
        builder.Property(x => x.Details).HasColumnName("details").HasColumnType("jsonb");
        builder.Property(x => x.Status).HasColumnName("status");
        builder.Property(x => x.CardProductId).HasColumnName("card_product_id");
        builder.Property(x => x.ResolvedByUserId).HasColumnName("resolved_by_user_id");
        builder.Property(x => x.ResolvedAt).HasColumnName("resolved_at");
        builder.Property(x => x.ResolutionNotes).HasColumnName("resolution_notes");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.Provider, x.ProviderCardId, x.ReasonCode }).IsUnique();
    }
}
