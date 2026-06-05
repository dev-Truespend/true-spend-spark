using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class PlaidNewAccountsNotificationHandler(IPlaidNewAccountsNotificationBusiness business) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = PlaidEventMapper.FromItemNewAccountsAvailableJson(payloadJson);
        await business.ProduceForNewAccountsAsync(
            contract.PlaidItemId,
            contract.UserId,
            contract.OccurredAt.ToUnixTimeMilliseconds().ToString(),
            cancellationToken);
    }
}
