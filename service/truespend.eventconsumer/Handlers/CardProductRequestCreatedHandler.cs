using System.Text.Json;
using TrueSpend.Domain.Events.Catalog;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class CardProductRequestCreatedHandler(ILogger<CardProductRequestCreatedHandler> logger) : IEventHandler
{
    public Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<CardProductRequestEventContract>(payloadJson)
            ?? throw new InvalidOperationException("Empty card_product_request.created payload");

        logger.LogInformation(
            "catalog.card_product_request.created received for user {UserId} request {RequestId}",
            contract.UserId, contract.RequestId);

        return Task.CompletedTask;
    }
}
