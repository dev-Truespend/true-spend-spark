using System.Text.Json;
using TrueSpend.Domain.Events.Insights;

namespace TrueSpend.EventConsumer.Handlers.Mappers;

public static class AIGenerationEventMapper
{
    public static AIGenerationCompletedEventContract FromJson(string payloadJson) =>
        JsonSerializer.Deserialize<AIGenerationCompletedEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid insights.ai_generation.completed payload");
}
