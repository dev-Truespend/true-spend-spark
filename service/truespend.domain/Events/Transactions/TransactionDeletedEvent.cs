namespace TrueSpend.Domain.Events.Transactions;

public sealed record TransactionDeletedEvent(int TransactionId, Guid UserId, string PayloadVersion = "1");
