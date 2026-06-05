using System.Text.Json;
using TrueSpend.Domain.Events.Notifications;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class NotificationsReadAllHandler(ILogger<NotificationsReadAllHandler> logger) : IEventHandler
{
    public Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = JsonSerializer.Deserialize<NotificationsReadAllEvent>(payloadJson)
            ?? throw new InvalidOperationException("Empty messaging.notifications.read_all payload");

        logger.LogInformation(
            "messaging.notifications.read_all received for user {UserId}",
            contract.UserId);

        return Task.CompletedTask;
    }
}
