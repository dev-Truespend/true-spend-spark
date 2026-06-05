using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class PlaidCardsCacheInvalidatorHandler(ICardsCacheInvalidatorBusiness invalidator) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = PlaidEventMapper.FromItemStatusChangedJson(payloadJson);
        await invalidator.InvalidateAsync(contract.UserId, cancellationToken);
    }
}
