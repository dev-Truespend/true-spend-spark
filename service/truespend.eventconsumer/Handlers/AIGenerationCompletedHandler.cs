using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class AIGenerationCompletedHandler(IAIInsightsCacheInvalidatorBusiness invalidator) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = AIGenerationEventMapper.FromJson(payloadJson);
        await invalidator.InvalidateForUserAsync(contract.UserId, contract.RunId, cancellationToken);
    }
}
