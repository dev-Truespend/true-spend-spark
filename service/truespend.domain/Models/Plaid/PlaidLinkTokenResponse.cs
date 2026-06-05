namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidLinkTokenResponse(string LinkToken, DateTimeOffset Expiration);
