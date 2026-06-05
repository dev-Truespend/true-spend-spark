namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidConnection(int Id, string InstitutionName, string? InstitutionLogoUrl, string Status, DateTimeOffset? LastSyncAt, int CardCount);
