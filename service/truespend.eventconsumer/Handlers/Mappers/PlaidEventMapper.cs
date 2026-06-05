using System.Text.Json;
using TrueSpend.Domain.Events.Plaid;

namespace TrueSpend.EventConsumer.Handlers.Mappers;

public static class PlaidEventMapper
{
    public static PlaidItemStatusChangedEventContract FromItemStatusChangedJson(string payloadJson) =>
        JsonSerializer.Deserialize<PlaidItemStatusChangedEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid finance.plaid_item.status_changed payload");

    public static PlaidItemNewAccountsAvailableEventContract FromItemNewAccountsAvailableJson(string payloadJson) =>
        JsonSerializer.Deserialize<PlaidItemNewAccountsAvailableEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid finance.plaid_item.new_accounts_available payload");

    public static PlaidConnectionEventContract FromConnectionEventJson(string payloadJson) =>
        JsonSerializer.Deserialize<PlaidConnectionEventContract>(payloadJson)
        ?? throw new InvalidOperationException("Invalid finance.plaid_connection.* payload");
}
