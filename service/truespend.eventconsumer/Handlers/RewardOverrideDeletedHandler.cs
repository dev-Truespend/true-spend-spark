using System.Text.Json;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.Events.Cards;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class RewardOverrideDeletedHandler(
    IAnalyticsComputeBusiness analytics,
    ILogger<RewardOverrideDeletedHandler> logger) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<RewardOverrideEventContract>(payloadJson)
            ?? throw new InvalidOperationException("Empty finance.reward_override.deleted payload");

        logger.LogInformation(
            "finance.reward_override.deleted received for user {UserId} card {UserCardId} category {Category}",
            contract.UserId, contract.UserCardId, contract.CategoryCode);

        await analytics.RecomputeSnapshotsAsync(contract.UserId, cancellationToken);
    }
}
