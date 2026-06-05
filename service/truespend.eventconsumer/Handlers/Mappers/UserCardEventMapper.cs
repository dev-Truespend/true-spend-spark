using System.Text.Json;
using TrueSpend.Domain.Events.Cards;

namespace TrueSpend.EventConsumer.Handlers.Mappers;

public static class UserCardEventMapper
{
    public static UserCardEventContract FromJson(string payloadJson) =>
        JsonSerializer.Deserialize<UserCardEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid user_card event payload");
}
