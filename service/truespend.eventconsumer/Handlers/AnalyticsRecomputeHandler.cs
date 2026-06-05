using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.EventConsumer.Handlers.Mappers;

namespace TrueSpend.EventConsumer.Handlers;

public sealed class AnalyticsRecomputeHandler(IAnalyticsComputeBusiness business) : IEventHandler
{
    public async Task HandleAsync(string payloadJson, CancellationToken cancellationToken)
    {
        var contract = TransactionEventMapper.FromJson(payloadJson);
        await business.RecomputeSnapshotsAsync(contract.UserId, cancellationToken);
    }
}
