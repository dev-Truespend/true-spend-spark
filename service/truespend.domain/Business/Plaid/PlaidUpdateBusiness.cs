using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Validators;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Business.Transactions;

namespace TrueSpend.Domain.Business.Plaid;

public sealed class PlaidUpdateBusiness(
    IPlaidProvider plaidProvider,
    IPlaidReadService readService,
    IPlaidUpdateService updateService,
    ITransactionsInsertService transactionsInsertService,
    ITransactionsUpdateService transactionsUpdateService,
    IRewardRulesReadService rewardRulesReadService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    IEntitlementGuard entitlementGuard,
    IManualResyncQuotaBusiness resyncQuota,
    IAnalyticsComputeBusiness analyticsCompute,
    IMissedRewardNotificationBusiness missedRewardNotification,
    PlaidValidator validator,
    ILogger<PlaidUpdateBusiness> logger) : IPlaidUpdateBusiness
{
    // Shown when a Pro user has used all of today's manual re-syncs.
    private static string ResyncLimitMessage(ManualResyncQuotaStatus status) =>
        $"You've used all {status.Limit} manual syncs for today. Your limit resets tomorrow.";

    public async Task<BusinessResponse<PlaidConnectionResponse>> SyncConnectionAsync(
        OnboardingWorkflowUser user,
        SyncPlaidConnectionRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken);

        // Pro-only daily quota for user-initiated sync (throws for non-Pro; returns 429 when over limit).
        var quota = await resyncQuota.TryConsumeAsync(user, cancellationToken);
        if (!quota.Allowed) return BusinessResponse<PlaidConnectionResponse>.Fail([ResyncLimitMessage(quota.Status)], 429);

        var connection = await readService.FindConnectionAsync(user, request.ConnectionId, cancellationToken);
        if (connection is null) return BusinessResponse<PlaidConnectionResponse>.Fail(["Connection not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.SyncConnectionAsync(request.ConnectionId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var state = await updateService.GetConnectionStateAsync(user, request.ConnectionId, cancellationToken);
        return BusinessResponse<PlaidConnectionResponse>.Ok(state);
    }

    public async Task<BusinessResponse<PlaidLinkTokenResponse>> ReconnectConnectionAsync(
        OnboardingWorkflowUser user,
        ReconnectPlaidConnectionRequest request,
        CancellationToken cancellationToken)
    {
        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken);
        var connection = await readService.FindConnectionAsync(user, request.ConnectionId, cancellationToken);
        if (connection is null) return BusinessResponse<PlaidLinkTokenResponse>.Fail(["Connection not found."], 404);

        try
        {
            var token = await plaidProvider.CreateLinkTokenAsync(user, cancellationToken);
            return BusinessResponse<PlaidLinkTokenResponse>.Ok(token);
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<PlaidLinkTokenResponse>.Fail([ex.Message], 503);
        }
    }

    public async Task<BusinessResponse<PlaidTransactionSyncResponse>> SyncPlaidTransactionsAsync(
        OnboardingWorkflowUser user,
        SyncPlaidTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateSyncTransactions(request);
        if (errors.Count > 0)
            return BusinessResponse<PlaidTransactionSyncResponse>.Fail(errors, 400);

        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken);

        // Pro-only daily quota for user-initiated sync. The automatic nightly sweep bypasses this by
        // calling SyncSingleConnectionAsync directly (see SyncAllActiveConnectionsAsync).
        var quota = await resyncQuota.TryConsumeAsync(user, cancellationToken);
        if (!quota.Allowed) return BusinessResponse<PlaidTransactionSyncResponse>.Fail([ResyncLimitMessage(quota.Status)], 429);

        if (request.ConnectionId is int connectionId)
        {
            return await SyncSingleConnectionAsync(user, connectionId, request.Force, cancellationToken);
        }

        // No connectionId: pull-to-refresh sweep across this user's active connections.
        var userConnections = await readService.GetConnectionsAsync(user, cancellationToken);
        var activeConnections = userConnections.Connections
            .Where(c => string.Equals(c.Status, "active", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var totalImported = 0;
        var totalUpdated = 0;
        var totalRemoved = 0;
        DateTimeOffset? lastSyncAt = null;

        foreach (var connection in activeConnections)
        {
            if (cancellationToken.IsCancellationRequested) break;
            var response = await SyncSingleConnectionAsync(user, connection.Id, request.Force, cancellationToken);
            if (!response.Success) continue;
            totalImported += response.Data!.ImportedCount;
            totalUpdated += response.Data.UpdatedCount;
            totalRemoved += response.Data.RemovedCount;
            if (response.Data.LastTransactionSyncAt is { } syncAt && (lastSyncAt is null || syncAt > lastSyncAt))
                lastSyncAt = syncAt;
        }

        return BusinessResponse<PlaidTransactionSyncResponse>.Ok(
            new PlaidTransactionSyncResponse(0, totalImported, totalUpdated, totalRemoved, lastSyncAt));
    }

    private async Task<BusinessResponse<PlaidTransactionSyncResponse>> SyncSingleConnectionAsync(
        OnboardingWorkflowUser user,
        int connectionId,
        bool force,
        CancellationToken cancellationToken)
    {
        var connection = await readService.FindConnectionAsync(user, connectionId, cancellationToken);
        if (connection is null) return BusinessResponse<PlaidTransactionSyncResponse>.Fail(["Connection not found."], 404);

        var credentials = await readService.GetConnectionCredentialsAsync(user, connectionId, cancellationToken);
        if (credentials is null) return BusinessResponse<PlaidTransactionSyncResponse>.Fail(["Connection credentials not found."], 404);

        PlaidTransactionsSyncResult syncResult;
        try
        {
            syncResult = await plaidProvider.SyncTransactionsAsync(credentials.AccessToken, credentials.TransactionSyncCursor, force, cancellationToken);
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<PlaidTransactionSyncResponse>.Fail([ex.Message], 503);
        }

        var rewardProfile = await rewardRulesReadService.GetUserRewardProfileAsync(user, cancellationToken);

        var imported = 0;
        var updated = 0;
        var removed = 0;
        var newMissedRewardEventIds = new List<int>();
        var changed = false;

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            foreach (var transaction in syncResult.Added)
            {
                var result = await transactionsInsertService.UpsertPlaidTransactionAsync(user, connectionId, transaction, cancellationToken);
                if (result is null || !result.IsNew) continue;

                var newMissed = await ComputeAndPersistRewardAsync(rewardProfile, result, isNew: true, cancellationToken);
                if (newMissed is { } imp) newMissedRewardEventIds.Add(imp);
                imported++;
                changed = true;
            }

            foreach (var transaction in syncResult.Modified)
            {
                var result = await transactionsInsertService.UpsertPlaidTransactionAsync(user, connectionId, transaction, cancellationToken);
                if (result is null) continue;

                var newMissed = await ComputeAndPersistRewardAsync(rewardProfile, result, isNew: false, cancellationToken);
                if (newMissed is { } upd) newMissedRewardEventIds.Add(upd);
                updated++;
                changed = true;
            }

            foreach (var plaidTransactionId in syncResult.RemovedPlaidTransactionIds)
            {
                var deleted = await transactionsInsertService.RemovePlaidTransactionAsync(user, plaidTransactionId, cancellationToken);
                if (deleted is null) continue;
                removed++;
                changed = true;
            }

            await updateService.UpdateTransactionSyncCursorAsync(connectionId, syncResult.NewCursor, syncResult.SyncAt, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        if (changed)
        {
            try
            {
                // Per refactor guide: per-user dedupe — call analytics recompute once per batch, not per row.
                await analyticsCompute.RecomputeSnapshotsAsync(user.UserId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Analytics recompute failed after plaid sync for user {UserId} connection {ConnectionId}", user.UserId, connectionId);
            }
        }

        foreach (var missedRewardEventId in newMissedRewardEventIds)
        {
            try
            {
                await missedRewardNotification.ProduceForMissedRewardEventAsync(missedRewardEventId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Missed reward notification failed for user {UserId} event {EventId}", user.UserId, missedRewardEventId);
            }
        }

        return BusinessResponse<PlaidTransactionSyncResponse>.Ok(
            new PlaidTransactionSyncResponse(connectionId, imported, updated, removed, syncResult.SyncAt));
    }

    public async Task SyncAllActiveConnectionsAsync(CancellationToken cancellationToken)
    {
        var connections = await readService.GetActiveConnectionsAsync(cancellationToken);
        foreach (var connection in connections)
        {
            if (cancellationToken.IsCancellationRequested) return;
            try
            {
                var user = new OnboardingWorkflowUser(connection.UserId, connection.UserEmail);

                // Plaid linking is a Basic+ entitlement. Skip free/downgraded users quietly so the sync
                // doesn't throw EntitlementRequiredAppException per connection and log it as an error.
                if (!await entitlementGuard.HasFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken))
                {
                    logger.LogInformation("Plaid sync skipped for connection {ConnectionId}: user not entitled to Plaid linking.", connection.ConnectionId);
                    continue;
                }

                // Bypass the user-initiated Pro quota gate: automatic nightly sync runs for all entitled
                // (Basic+) users and must not consume the manual re-sync allowance.
                var response = await SyncSingleConnectionAsync(user, connection.ConnectionId, force: false, cancellationToken);
                if (!response.Success)
                    logger.LogWarning("Plaid sync failed for connection {ConnectionId}: {Errors}", connection.ConnectionId, string.Join("; ", response.Errors));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "Plaid sync threw for connection {ConnectionId}", connection.ConnectionId);
            }
        }
    }

    public async Task<BusinessResponse<PlaidConnectionResponse>> DisconnectConnectionAsync(
        OnboardingWorkflowUser user,
        DisconnectPlaidConnectionRequest request,
        CancellationToken cancellationToken)
    {
        await entitlementGuard.RequireFeatureAsync(user, BillingConstants.PlaidLinkingEnabledFeatureCode, cancellationToken);
        var connection = await readService.FindConnectionAsync(user, request.ConnectionId, cancellationToken);
        if (connection is null) return BusinessResponse<PlaidConnectionResponse>.Fail(["Connection not found."], 404);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await updateService.DisconnectConnectionAsync(request.ConnectionId, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var state = await updateService.GetConnectionStateAsync(user, request.ConnectionId, cancellationToken);
        return BusinessResponse<PlaidConnectionResponse>.Ok(state);
    }

    private async Task<int?> ComputeAndPersistRewardAsync(
        IReadOnlyList<UserCardReward> rewardProfile,
        PlaidTransactionUpsertResult upsert,
        bool isNew,
        CancellationToken cancellationToken)
    {
        var computed = TransactionRewardCalculator.Compute(rewardProfile, upsert.UserCardId, upsert.Amount, upsert.CategoryCode, upsert.MerchantName);
        if (computed is null) return null;

        if (isNew)
        {
            await transactionsInsertService.InsertRewardResultAsync(upsert.TransactionId, computed.RewardResult, cancellationToken);
            if (computed.HasMissedReward)
            {
                return await transactionsInsertService.InsertMissedRewardAsync(
                    upsert.TransactionId, computed.BetterCard!.Card.Id, computed.RewardResult.EarnedAmount, computed.PotentialAmount, computed.MissedAmount, cancellationToken);
            }
            return null;
        }

        await transactionsUpdateService.UpsertRewardResultAsync(upsert.TransactionId, computed.RewardResult, cancellationToken);
        if (computed.HasMissedReward)
        {
            var upsertResult = await transactionsUpdateService.UpsertMissedRewardAsync(
                upsert.TransactionId, computed.BetterCard!.Card.Id, computed.RewardResult.EarnedAmount, computed.PotentialAmount, computed.MissedAmount, cancellationToken);
            return upsertResult.IsNew ? upsertResult.MissedRewardEventId : null;
        }

        await transactionsUpdateService.DeleteMissedRewardAsync(upsert.TransactionId, cancellationToken);
        return null;
    }

    #region archive — async event-publish (disabled in MVP)
    // PlaidUpdateBusiness previously published many events to the messaging outbox:
    //   • SyncConnectionAsync → PlaidConnectionSynced (no subscriber). Archived; no inline replacement.
    //   • SyncSingleConnectionAsync per added/modified transaction → TransactionImported / TransactionUpdated.
    //     Both consumed by AnalyticsRecomputeHandler → IAnalyticsComputeBusiness.RecomputeSnapshotsAsync.
    //     Per refactor guide: replaced with a single RecomputeSnapshotsAsync(user) call after the sync loop
    //     (per-user dedupe; the handler is full-snapshot so per-row would multiply work N×).
    //   • SyncSingleConnectionAsync per removed transaction → TransactionDeleted (same handler as above,
    //     covered by the single per-user recompute).
    //   • SyncSingleConnectionAsync per new missed-reward → MissedRewardEventCreated. Consumer:
    //     MissedRewardEventCreatedHandler → IMissedRewardNotificationBusiness.ProduceForMissedRewardEventAsync.
    //     Replaced with an inline ProduceForMissedRewardEventAsync call per new missed-reward (post-commit).
    //   • DisconnectConnectionAsync → PlaidConnectionDisconnected (no-op handler — effects were already
    //     handled by per-card UserCardUpdated events, which had no subscriber). Archived; no inline.
    //   • DisconnectConnectionAsync per affected card → UserCardUpdated (no subscriber). Archived; no inline.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Cards;
    // using TrueSpend.Domain.Events.Finance;
    // using TrueSpend.Domain.Events.Plaid;
    // using TrueSpend.Domain.Events.Transactions;
    //
    // // SyncConnectionAsync — inside the committing tx, after SyncConnectionAsync:
    // var payload = JsonSerializer.Serialize(new PlaidConnectionEventContract(request.ConnectionId, user.UserId, DateTimeOffset.UtcNow));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.PlaidConnectionSynced, "finance.plaid_item", request.ConnectionId, payload, null, cancellationToken);
    //
    // // SyncSingleConnectionAsync — per added transaction (TransactionImported), inside the committing tx:
    // await EnqueueTransactionEventAsync(EventTypes.TransactionImported, result, user.UserId, cancellationToken);
    // if (newMissed is { } imp) await EnqueueMissedRewardEventCreatedAsync(imp, result.TransactionId, user.UserId, cancellationToken);
    //
    // // SyncSingleConnectionAsync — per modified transaction (TransactionUpdated), inside the committing tx:
    // await EnqueueTransactionEventAsync(EventTypes.TransactionUpdated, result, user.UserId, cancellationToken);
    // if (newMissed is { } upd) await EnqueueMissedRewardEventCreatedAsync(upd, result.TransactionId, user.UserId, cancellationToken);
    //
    // // SyncSingleConnectionAsync — per removed transaction (TransactionDeleted), inside the committing tx:
    // var payload = JsonSerializer.Serialize(new TransactionEventContract(
    //     deleted.TransactionId, user.UserId, deleted.UserCardId, TransactionsConstants.SourcePlaid,
    //     deleted.Amount, null, deleted.TransactionDate));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.TransactionDeleted, "finance.transaction", deleted.TransactionId, payload,
    //     $"transaction.deleted:{deleted.TransactionId}", cancellationToken);
    //
    // // DisconnectConnectionAsync — inside the committing tx, after DisconnectConnectionAsync (returns affected card ids):
    // var affectedCardIds = await updateService.DisconnectConnectionAsync(request.ConnectionId, cancellationToken);
    // var now = DateTimeOffset.UtcNow;
    // var payload = JsonSerializer.Serialize(new PlaidConnectionEventContract(request.ConnectionId, user.UserId, now));
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.PlaidConnectionDisconnected, "finance.plaid_item", request.ConnectionId, payload, null, cancellationToken);
    // foreach (var cardId in affectedCardIds)
    // {
    //     var cardPayload = JsonSerializer.Serialize(new UserCardEventContract(
    //         cardId, user.UserId, null, null,
    //         TransactionsConstants.SourcePlaid, CardsConstants.DisconnectedSyncStatus, false, now));
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.UserCardUpdated, "finance.user_card", cardId, cardPayload,
    //         $"user_card.updated:disconnect:{request.ConnectionId}:{cardId}", cancellationToken);
    // }
    //
    // // Helper methods previously hosted here:
    // private async Task EnqueueTransactionEventAsync(
    //     string eventType, PlaidTransactionUpsertResult upsert, Guid userId, CancellationToken ct)
    // {
    //     var payload = JsonSerializer.Serialize(new TransactionEventContract(
    //         upsert.TransactionId, userId, upsert.UserCardId, TransactionsConstants.SourcePlaid,
    //         upsert.Amount, null, upsert.TransactionDate));
    //     var idempotencyKey = eventType == EventTypes.TransactionImported
    //         ? $"transaction.imported:{upsert.TransactionId}"
    //         : $"transaction.updated:{upsert.TransactionId}:{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         eventType, "finance.transaction", upsert.TransactionId, payload, idempotencyKey, ct);
    // }
    //
    // private async Task EnqueueMissedRewardEventCreatedAsync(
    //     int missedRewardEventId, int transactionId, Guid userId, CancellationToken ct)
    // {
    //     var payload = JsonSerializer.Serialize(new MissedRewardEventCreatedContract(
    //         1, missedRewardEventId, transactionId, userId, DateTimeOffset.UtcNow));
    //     await messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.MissedRewardEventCreated, "finance.missed_reward_event", missedRewardEventId,
    //         payload, $"missed_reward_event.created:{missedRewardEventId}", ct);
    // }
    #endregion
}
