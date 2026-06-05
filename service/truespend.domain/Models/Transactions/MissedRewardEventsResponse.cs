namespace TrueSpend.Domain.Models.Transactions;

public sealed record MissedRewardEventsResponse(IReadOnlyList<MissedReward> MissedRewards);
