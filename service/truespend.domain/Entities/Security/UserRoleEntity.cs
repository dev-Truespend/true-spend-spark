namespace TrueSpend.Domain.Entities.Security;

public sealed class UserRoleEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public short RoleId { get; set; }
    public Guid? GrantedByUserId { get; set; }
    public DateTimeOffset GrantedAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
