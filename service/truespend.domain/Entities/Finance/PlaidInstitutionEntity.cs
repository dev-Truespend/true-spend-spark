namespace TrueSpend.Domain.Entities.Finance;

public sealed class PlaidInstitutionEntity
{
    public int Id { get; set; }
    public string PlaidInstitutionId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public string? PrimaryColor { get; set; }
    public string? Url { get; set; }
    public bool Oauth { get; set; }
    public string[] Products { get; set; } = Array.Empty<string>();
    public string[] RoutingNumbers { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; } = true;
    public DateTimeOffset LastSyncedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
