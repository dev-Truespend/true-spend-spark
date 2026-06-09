using System.Text.Json;
using TrueSpend.Api.ViewModels.Geo;
using TrueSpend.Api.ViewModels.Plaid;
using DomainExchange = TrueSpend.Domain.Models.Plaid.ExchangePlaidTokenRequest;
using DomainLinkToken = TrueSpend.Domain.Models.Plaid.PlaidLinkTokenResponse;
using DomainConnection = TrueSpend.Domain.Models.Plaid.PlaidConnectionResponse;
using DomainConnections = TrueSpend.Domain.Models.Plaid.PlaidConnectionsResponse;
using DomainPlaidConnection = TrueSpend.Domain.Models.Plaid.PlaidConnection;
using DomainSync = TrueSpend.Domain.Models.Plaid.SyncPlaidConnectionRequest;
using DomainReconnect = TrueSpend.Domain.Models.Plaid.ReconnectPlaidConnectionRequest;
using DomainDisconnect = TrueSpend.Domain.Models.Plaid.DisconnectPlaidConnectionRequest;
using DomainSyncTransactions = TrueSpend.Domain.Models.Transactions.SyncPlaidTransactionsRequest;
using DomainTransactionSyncResponse = TrueSpend.Domain.Models.Transactions.PlaidTransactionSyncResponse;
using DomainWebhookInput = TrueSpend.Domain.Models.Plaid.PlaidWebhookInput;
using DomainWebhookResult = TrueSpend.Domain.Models.Plaid.PlaidWebhookResult;
using DomainResyncQuota = TrueSpend.Domain.Models.Billing.ManualResyncQuotaStatus;

namespace TrueSpend.Api.Mappers;

public interface IPlaidMapper
{
    DomainExchange ToDomain(ExchangePlaidTokenRequestVm request);
    DomainSync ToDomain(SyncPlaidConnectionRequestVm request);
    DomainReconnect ToDomain(ReconnectPlaidConnectionRequestVm request);
    DomainDisconnect ToDomain(DisconnectPlaidConnectionRequestVm request);
    DomainSyncTransactions ToDomain(SyncPlaidTransactionsRequestVm request);
    PlaidLinkTokenResponseVm ToLinkToken(DomainLinkToken domain);
    PlaidConnectionResponseVm ToConnection(DomainConnection domain, ICardsMapper cardsMapper);
    PlaidConnectionsResponseVm ToConnections(DomainConnections domain);
    PlaidTransactionSyncResponseVm ToTransactionSync(DomainTransactionSyncResponse domain);
    ManualResyncQuotaResponseVm ToResyncQuota(DomainResyncQuota domain);
    DomainWebhookInput ParsePlaidWebhook(string rawBody);
    WebhookAckResponseVm ToWebhookAck(DomainWebhookResult result);
}

public sealed class PlaidMapper : IPlaidMapper
{
    public DomainExchange ToDomain(ExchangePlaidTokenRequestVm request) => new(request.PublicToken);
    public DomainSync ToDomain(SyncPlaidConnectionRequestVm request) => new(request.ConnectionId);
    public DomainReconnect ToDomain(ReconnectPlaidConnectionRequestVm request) => new(request.ConnectionId);
    public DomainDisconnect ToDomain(DisconnectPlaidConnectionRequestVm request) => new(request.ConnectionId);
    public DomainSyncTransactions ToDomain(SyncPlaidTransactionsRequestVm request) => new(request.ConnectionId, request.Force);

    public PlaidLinkTokenResponseVm ToLinkToken(DomainLinkToken domain) => new(domain.LinkToken, domain.Expiration);

    public PlaidConnectionResponseVm ToConnection(DomainConnection domain, ICardsMapper cardsMapper) =>
        new(
            domain.Connections.Select(ToConnectionVm).ToArray(),
            domain.Cards.Select(cardsMapper.ToCardSummary).ToArray(),
            domain.CardSyncStatus);

    public PlaidConnectionsResponseVm ToConnections(DomainConnections domain) =>
        new(domain.Connections.Select(ToConnectionVm).ToArray());

    public PlaidTransactionSyncResponseVm ToTransactionSync(DomainTransactionSyncResponse domain) =>
        new(domain.ConnectionId, domain.ImportedCount, domain.UpdatedCount, domain.RemovedCount, domain.LastTransactionSyncAt);

    public ManualResyncQuotaResponseVm ToResyncQuota(DomainResyncQuota domain) =>
        new(domain.IsPro, domain.Limit, domain.Used, domain.Remaining);

    private static PlaidConnectionVm ToConnectionVm(DomainPlaidConnection domain) =>
        new(domain.Id, domain.InstitutionName, domain.InstitutionLogoUrl, domain.Status, domain.LastSyncAt, domain.CardCount);

    public DomainWebhookInput ParsePlaidWebhook(string rawBody)
    {
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return new DomainWebhookInput(string.Empty, string.Empty, string.Empty, null, null, "{}");
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        var webhookType = ReadString(root, "webhook_type") ?? string.Empty;
        var webhookCode = ReadString(root, "webhook_code") ?? string.Empty;
        var itemId = ReadString(root, "item_id");
        var eventId = ReadString(root, "webhook_id") ?? ReadString(root, "request_id") ?? BuildSyntheticId(webhookType, webhookCode, itemId);

        string? errorMessage = null;
        if (root.TryGetProperty("error", out var errorEl) && errorEl.ValueKind == JsonValueKind.Object)
        {
            errorMessage = ReadString(errorEl, "error_message")
                ?? ReadString(errorEl, "display_message")
                ?? ReadString(errorEl, "error_code");
        }

        return new DomainWebhookInput(
            eventId,
            webhookType,
            webhookCode,
            itemId,
            errorMessage,
            rawBody);
    }

    public WebhookAckResponseVm ToWebhookAck(DomainWebhookResult result) =>
        new(result.Received, result.Deduplicated);

    private static string? ReadString(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out var el)) return null;
        return el.ValueKind == JsonValueKind.String ? el.GetString() : null;
    }

    private static string BuildSyntheticId(string webhookType, string webhookCode, string? itemId) =>
        $"{webhookType}:{webhookCode}:{itemId ?? "unknown"}:{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
}
