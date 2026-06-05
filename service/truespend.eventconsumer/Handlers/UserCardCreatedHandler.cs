using System.Text.Json;
using TrueSpend.Domain.Events.Cards;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class UserCardCreatedHandler(ILogger<UserCardCreatedHandler> logger) : IEventHandler
{
    public Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<UserCardEventContract>(payloadJson)
            ?? throw new InvalidOperationException("Empty user_card.created payload");

        logger.LogInformation(
            "user_card.created received for user {UserId} card {UserCardId} (source={Source})",
            contract.UserId, contract.UserCardId, contract.SourceCode);

        return Task.CompletedTask;
    }
}
