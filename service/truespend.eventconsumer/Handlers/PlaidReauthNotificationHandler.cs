using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class PlaidReauthNotificationHandler(IPlaidReauthNotificationBusiness business) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = PlaidEventMapper.FromItemStatusChangedJson(payloadJson);
        await business.ProduceForStatusChangeAsync(
            contract.PlaidItemId,
            contract.UserId,
            contract.StatusCode,
            contract.LastError,
            contract.OccurredAt.ToUnixTimeMilliseconds().ToString(),
            cancellationToken);
    }
}
