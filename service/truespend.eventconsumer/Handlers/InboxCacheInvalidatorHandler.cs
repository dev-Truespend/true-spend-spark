using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class InboxCacheInvalidatorHandler(INotificationInboxCacheInvalidatorBusiness invalidator) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = NotificationEventMapper.FromCreatedJson(payloadJson);
        await invalidator.InvalidateAsync(contract.UserId, cancellationToken);
    }
}
