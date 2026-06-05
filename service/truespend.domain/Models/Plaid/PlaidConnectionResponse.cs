using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidConnectionResponse(IReadOnlyList<PlaidConnection> Connections, IReadOnlyList<CardSummary> Cards, string CardSyncStatus);
