namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidActiveConnection(int ConnectionId, Guid UserId, string? UserEmail);
