using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

// No-op acknowledger; downstream business effects already happen synchronously inside
// PlaidUpdateBusiness.DisconnectConnectionAsync (UserCardUpdated events for affected cards
// drive cache invalidation). Keeping the subscription wired lets outbox metrics show the
// event was successfully fanned out.
public sealed class PlaidConnectionDisconnectedHandler : IEventHandler
{
    public Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        _ = PlaidEventMapper.FromConnectionEventJson(payloadJson);
        return Task.CompletedTask;
    }
}
