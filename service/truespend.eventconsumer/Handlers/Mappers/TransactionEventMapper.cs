using System.Text.Json;
using TrueSpend.Domain.Events.Transactions;

namespace TrueSpend.EventConsumer.Handlers.Mappers;

public static class TransactionEventMapper
{
    public static TransactionEventContract FromJson(string payloadJson) =>
        JsonSerializer.Deserialize<TransactionEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid transaction event payload");
}
