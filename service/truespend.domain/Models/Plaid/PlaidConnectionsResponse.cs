namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidConnectionsResponse(IReadOnlyList<PlaidConnection> Connections);
