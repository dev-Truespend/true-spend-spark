using System.Text.Json;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Events.Finance;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class MissedRewardEventCreatedHandler(IMissedRewardNotificationBusiness business) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<MissedRewardEventCreatedContract>(payloadJson)
            ?? throw new InvalidOperationException("Empty finance.missed_reward_event.created payload");

        await business.ProduceForMissedRewardEventAsync(contract.MissedRewardEventId, cancellationToken);
    }
}
