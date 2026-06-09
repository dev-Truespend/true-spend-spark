using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Services.Persistence;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidWebhookBusiness(
    IPlaidWebhookService webhookService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IPlaidReauthNotificationBusiness plaidReauthNotification,
    IPlaidNewAccountsNotificationBusiness plaidNewAccountsNotification,
    ICardsCacheInvalidatorBusiness cardsCacheInvalidator,
    ILogger<PlaidWebhookBusiness> logger) : IPlaidWebhookBusiness
{
    public async Task<BusinessResponse<PlaidWebhookResult>> HandleEventAsync(
        PlaidWebhookInput input,
        CancellationToken cancellationToken)
    {
        _ = messagingInsert;

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

        PlaidWebhookMapping mapping = default;
        bool committed = false;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
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

                mapping = MapWebhook(input.WebhookType, input.WebhookCode);
                if (mapping.NewStatusCode is { } statusCode)
                {
                    var statusId = await webhookService.GetItemStatusIdAsync(statusCode, cancellationToken);
                    if (statusId is not null)
                    {
                        await webhookService.UpdateItemStatusAsync(item.Id, statusId.Value, input.Error, cancellationToken);
                    }
                }

                await webhookService.MarkWebhookProcessedAsync(webhookEventId, null, cancellationToken);
                await tx.CommitAsync(cancellationToken);
                committed = true;
            }
            catch
            {
                await tx.RollbackAsync(cancellationToken);
                throw;
            }
        }

        if (!committed || item is null)
        {
            return BusinessResponse<PlaidWebhookResult>.Ok(
                new PlaidWebhookResult(true, false, item?.Id, mapping.NewStatusCode));
        }

        await RunInlineHandlersAsync(input, item, mapping, cancellationToken);

        return BusinessResponse<PlaidWebhookResult>.Ok(
            new PlaidWebhookResult(true, false, item.Id, mapping.NewStatusCode));
    }

    private async Task RunInlineHandlersAsync(
        PlaidWebhookInput input,
        PlaidItemReference item,
        PlaidWebhookMapping mapping,
        CancellationToken cancellationToken)
    {
        if (mapping.EventType is null) return;

        var occurredAtKey = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

        if (mapping.IsNewAccountsAvailable)
        {
            try
            {
                await plaidNewAccountsNotification.ProduceForNewAccountsAsync(
                    item.Id, item.UserId, occurredAtKey, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Plaid new-accounts notification failed for item {ItemId} user {UserId}", item.Id, item.UserId);
            }
            return;
        }

        // mapping.EventType == EventTypes.PlaidItemStatusChanged: two inline collaborators.
        try
        {
            await plaidReauthNotification.ProduceForStatusChangeAsync(
                item.Id,
                item.UserId,
                mapping.NewStatusCode ?? string.Empty,
                input.Error,
                occurredAtKey,
                cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Plaid reauth notification failed for item {ItemId} user {UserId}", item.Id, item.UserId);
        }

        try
        {
            await cardsCacheInvalidator.InvalidateAsync(item.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Cards cache invalidation failed for user {UserId} after plaid status change", item.UserId);
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

    #region archive — async event-publish (disabled in MVP)
    // HandleEventAsync previously published one of two events to the messaging outbox depending
    // on the webhook code:
    //   1. PlaidItemStatusChanged (2 subs) — consumers: PlaidReauthNotificationHandler →
    //      IPlaidReauthNotificationBusiness.ProduceForStatusChangeAsync; PlaidCardsCacheInvalidatorHandler →
    //      ICardsCacheInvalidatorBusiness.InvalidateAsync. Both now inline post-commit.
    //   2. PlaidItemNewAccountsAvailable — consumer: PlaidNewAccountsNotificationHandler →
    //      IPlaidNewAccountsNotificationBusiness.ProduceForNewAccountsAsync. Now inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Plaid;
    //
    // // Inside the committing tx, after UpdateItemStatusAsync / before MarkWebhookProcessedAsync:
    // if (mapping.EventType is { } eventType)
    // {
    //     var payload = mapping.IsNewAccountsAvailable
    //         ? JsonSerializer.Serialize(new PlaidItemNewAccountsAvailableEventContract(
    //             1, item.Id, item.UserId, DateTimeOffset.UtcNow))
    //         : JsonSerializer.Serialize(new PlaidItemStatusChangedEventContract(
    //             1, item.Id, item.UserId, mapping.NewStatusCode ?? string.Empty, input.Error, DateTimeOffset.UtcNow));
    //     await messagingInsert.EnqueueOutboxEventAsync(
    //         eventType, "finance.plaid_item", item.Id, payload,
    //         $"{eventType}:{input.PlaidEventId}", cancellationToken);
    // }
    #endregion
}
