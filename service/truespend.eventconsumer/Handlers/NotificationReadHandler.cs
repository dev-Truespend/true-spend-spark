using System.Text.Json;
using TrueSpend.Domain.Events.Notifications;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class NotificationReadHandler(ILogger<NotificationReadHandler> logger) : IEventHandler
{
    public Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<NotificationReadEventContract>(payloadJson)
            ?? throw new InvalidOperationException("Empty messaging.notification.read payload");

        logger.LogInformation(
            "messaging.notification.read received for user {UserId} notification {NotificationId}",
            contract.UserId, contract.NotificationId);

        return Task.CompletedTask;
    }
}
