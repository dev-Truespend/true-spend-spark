namespace TrueSpend.Domain.Models.Transactions;

public sealed record MissedRewardUpsertResult(int MissedRewardEventId, bool IsNew);
