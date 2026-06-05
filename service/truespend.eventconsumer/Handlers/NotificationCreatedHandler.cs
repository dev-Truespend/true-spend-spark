using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class NotificationCreatedHandler(INotificationsDispatchBusiness dispatchBusiness) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = NotificationEventMapper.FromCreatedJson(payloadJson);
        await dispatchBusiness.DispatchPushAsync(contract.NotificationId, cancellationToken);
    }
}
