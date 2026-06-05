using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Events.Plaid;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Services.Persistence;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidWebhookBusiness(
    IPlaidWebhookService webhookService,
    IMessagingInsertService messagingInsert,
    IUnitOfWork unitOfWork) : IPlaidWebhookBusiness
{
    public async Task<BusinessResponse<PlaidWebhookResult>> HandleEventAsync(
        PlaidWebhookInput input,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(input.PlaidEventId) ||
            string.IsNullOrWhiteSpace(input.WebhookType) ||
            string.IsNullOrWhiteSpace(input.WebhookCode))
        {
            return BusinessResponse<PlaidWebhookResult>.Fail(
                ["Plaid event id, webhook type, and webhook code are required."], 400);
        }

        if (await webhookService.WebhookEventExistsAsync(input.PlaidEventId, cancellationToken))
        {
            return BusinessResponse<PlaidWebhookResult>.Ok(
                new PlaidWebhookResult(true, true, null, null));
        }

        PlaidItemReference? item = null;
        if (!string.IsNullOrWhiteSpace(input.PlaidItemExternalId))
        {
            item = await webhookService.ResolveItemAsync(input.PlaidItemExternalId!, cancellationToken);
        }

        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        int webhookEventId;
        try
        {
            webhookEventId = await webhookService.RecordWebhookEventAsync(
                input, item?.Id, item?.UserId, cancellationToken);
        }
        catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
        {
            // Concurrent webhook with the same plaid_event_id won the insert race —
            // treat as a dedup hit so Plaid stops retrying.
            await tx.RollbackAsync(cancellationToken);
            return BusinessResponse<PlaidWebhookResult>.Ok(
                new PlaidWebhookResult(true, true, null, null));
        }

        try
        {
            if (item is null)
            {
                await webhookService.MarkWebhookProcessedAsync(webhookEventId, "unknown_plaid_item", cancellationToken);
                await tx.CommitAsync(cancellationToken);
                return BusinessResponse<PlaidWebhookResult>.Ok(
                    new PlaidWebhookResult(true, false, null, null));
            }

            var mapping = MapWebhook(input.WebhookType, input.WebhookCode);
            if (mapping.NewStatusCode is { } statusCode)
            {
                var statusId = await webhookService.GetItemStatusIdAsync(statusCode, cancellationToken);
                if (statusId is not null)
                {
                    await webhookService.UpdateItemStatusAsync(item.Id, statusId.Value, input.Error, cancellationToken);
                }
            }

            if (mapping.EventType is { } eventType)
            {
                var payload = mapping.IsNewAccountsAvailable
                    ? JsonSerializer.Serialize(new PlaidItemNewAccountsAvailableEventContract(
                        1, item.Id, item.UserId, DateTimeOffset.UtcNow))
                    : JsonSerializer.Serialize(new PlaidItemStatusChangedEventContract(
                        1, item.Id, item.UserId, mapping.NewStatusCode ?? string.Empty, input.Error, DateTimeOffset.UtcNow));

                await messagingInsert.EnqueueOutboxEventAsync(
                    eventType,
                    "finance.plaid_item",
                    item.Id,
                    payload,
                    $"{eventType}:{input.PlaidEventId}",
                    cancellationToken);
            }

            await webhookService.MarkWebhookProcessedAsync(webhookEventId, null, cancellationToken);
            await tx.CommitAsync(cancellationToken);

            return BusinessResponse<PlaidWebhookResult>.Ok(
                new PlaidWebhookResult(true, false, item.Id, mapping.NewStatusCode));
        }
        catch
        {
            await tx.RollbackAsync(cancellationToken);
            throw;
        }
    }

    private static PlaidWebhookMapping MapWebhook(string webhookType, string webhookCode)
    {
        if (!string.Equals(webhookType, PlaidConstants.WebhookTypeItem, StringComparison.OrdinalIgnoreCase))
        {
            return new PlaidWebhookMapping(null, null, false);
        }

        return webhookCode.ToUpperInvariant() switch
        {
            PlaidConstants.WebhookCodeItemLoginRequired or PlaidConstants.WebhookCodeItemPendingExpiration =>
                new PlaidWebhookMapping(PlaidConstants.ItemStatusLoginRequired, EventTypes.PlaidItemStatusChanged, false),
            PlaidConstants.WebhookCodeItemError =>
                new PlaidWebhookMapping(PlaidConstants.ItemStatusError, EventTypes.PlaidItemStatusChanged, false),
            PlaidConstants.WebhookCodeItemUserPermissionRevoked =>
                new PlaidWebhookMapping(PlaidConstants.ItemStatusDisconnected, EventTypes.PlaidItemStatusChanged, false),
            PlaidConstants.WebhookCodeItemNewAccountsAvailable =>
                new PlaidWebhookMapping(null, EventTypes.PlaidItemNewAccountsAvailable, true),
            _ => new PlaidWebhookMapping(null, null, false),
        };
    }

    private readonly record struct PlaidWebhookMapping(string? NewStatusCode, string? EventType, bool IsNewAccountsAvailable);
}
