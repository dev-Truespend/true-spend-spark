namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidInstitutionData(
    string PlaidInstitutionId,
    string Name,
    string CountryCode,
    string? LogoUrl,
    string? PrimaryColor,
    string? Url,
    bool Oauth,
    IReadOnlyList<string> Products,
    IReadOnlyList<string> RoutingNumbers);
