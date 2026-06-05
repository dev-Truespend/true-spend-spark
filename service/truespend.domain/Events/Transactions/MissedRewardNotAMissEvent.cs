namespace TrueSpend.Domain.Events.Transactions;

public sealed record MissedRewardNotAMissEvent(int MissedRewardId, int TransactionId, Guid UserId, string PayloadVersion = "1");
