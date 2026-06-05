namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidConnectionCredentials(string AccessToken, string? TransactionSyncCursor);
