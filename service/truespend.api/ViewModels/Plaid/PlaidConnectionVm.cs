namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record PlaidConnectionVm(
    int Id,
    string InstitutionName,
    string? InstitutionLogoUrl,
    string Status,
    DateTimeOffset? LastSyncAt,
    int CardCount);
