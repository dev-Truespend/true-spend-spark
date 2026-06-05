using System.Text.Json;
using TrueSpend.Domain.Events.Notifications;

namespace TrueSpend.EventConsumer.Handlers.Mappers;

public static class NotificationEventMapper
{
    public static NotificationCreatedEventContract FromCreatedJson(string payloadJson) =>
        JsonSerializer.Deserialize<NotificationCreatedEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid messaging.notification.created payload");
}
