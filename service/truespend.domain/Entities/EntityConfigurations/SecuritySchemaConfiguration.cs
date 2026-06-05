using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TrueSpend.Domain.Entities.Security;

namespace TrueSpend.Domain.Entities.EntityConfigurations;

public sealed class UserRoleEntityConfiguration : IEntityTypeConfiguration<UserRoleEntity>
{
    public void Configure(EntityTypeBuilder<UserRoleEntity> builder)
    {
        builder.ToTable("user_roles", "security");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id");
        builder.Property(x => x.RoleId).HasColumnName("role_id");
        builder.Property(x => x.GrantedByUserId).HasColumnName("granted_by_user_id");
        builder.Property(x => x.GrantedAt).HasColumnName("granted_at");
        builder.Property(x => x.ExpiresAt).HasColumnName("expires_at");
        builder.Property(x => x.RevokedAt).HasColumnName("revoked_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at");
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        builder.HasIndex(x => x.UserId);
    }
}
