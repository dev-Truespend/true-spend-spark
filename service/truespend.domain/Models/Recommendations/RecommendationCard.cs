using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.Models.Recommendations;

public sealed record RecommendationCard(CardSummary Card, decimal ExpectedRewardRate, Money ExpectedReward, string Reason, int Rank);
