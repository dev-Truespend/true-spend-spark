using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Foursquare;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class FoursquareChainEntityConfiguration : IEntityTypeConfiguration<FoursquareChainEntity>
{
    public void Configure(EntityTypeBuilder<FoursquareChainEntity> builder)
    {
        builder.ToTable("chains", "foursquare");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.ProviderChainId).HasColumnName("provider_chain_id");
        builder.Property(x => x.Name).HasColumnName("name");
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name");
        builder.Property(x => x.DefaultCategoryId).HasColumnName("default_category_id");
        builder.Property(x => x.LogoUrl).HasColumnName("logo_url");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.ProviderChainId).IsUnique();
    }
}

public sealed class FoursquarePlaceEntityConfiguration : IEntityTypeConfiguration<FoursquarePlaceEntity>
{
    public void Configure(EntityTypeBuilder<FoursquarePlaceEntity> builder)
    {
        builder.ToTable("places", "foursquare");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.Provider).HasColumnName("provider");
        builder.Property(x => x.ProviderPlaceId).HasColumnName("provider_place_id");
        builder.Property(x => x.ChainId).HasColumnName("chain_id");
        builder.Property(x => x.Name).HasColumnName("name");
        builder.Property(x => x.NormalizedName).HasColumnName("normalized_name");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Lat).HasColumnName("lat").HasPrecision(9, 6);
        builder.Property(x => x.Lng).HasColumnName("lng").HasPrecision(9, 6);
        builder.Property(x => x.Address).HasColumnName("address");
        builder.Property(x => x.Locality).HasColumnName("locality");
        builder.Property(x => x.Region).HasColumnName("region");
        builder.Property(x => x.PostalCode).HasColumnName("postal_code");
        builder.Property(x => x.Country).HasColumnName("country");
        builder.Property(x => x.Source).HasColumnName("source");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.LastSeenAt).HasColumnName("last_seen_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => new { x.Provider, x.ProviderPlaceId }).IsUnique();
        builder.HasIndex(x => x.ChainId);
    }
}

public sealed class FoursquareCategoryBridgeEntityConfiguration : IEntityTypeConfiguration<FoursquareCategoryBridgeEntity>
{
    public void Configure(EntityTypeBuilder<FoursquareCategoryBridgeEntity> builder)
    {
        builder.ToTable("category_bridge", "foursquare");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.FoursquareCategoryId).HasColumnName("foursquare_category_id");
        builder.Property(x => x.FoursquareCategoryPath).HasColumnName("foursquare_category_path");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.IncludeDescendants).HasColumnName("include_descendants");
        builder.Property(x => x.IsActive).HasColumnName("is_active");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.FoursquareCategoryId).IsUnique();
    }
}
