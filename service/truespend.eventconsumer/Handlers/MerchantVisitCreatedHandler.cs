using System.Text.Json;
using TrueSpend.Domain.Events.Merchants;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class MerchantVisitCreatedHandler(ILogger<MerchantVisitCreatedHandler> logger) : IEventHandler
{
    public Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<MerchantVisitEventContract>(payloadJson)
            ?? throw new InvalidOperationException("Empty merchant_visit.created payload");

        logger.LogInformation(
            "finance.merchant_visit.created received for user {UserId} merchant {MerchantId} visit {VisitId}",
            contract.UserId, contract.MerchantId, contract.VisitId);

        return Task.CompletedTask;
    }
}
