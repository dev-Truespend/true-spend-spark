using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Geo;

public sealed class FoursquareWebhookBusiness(
    IGeoWebhookReadService readService,
    IGeoWebhookInsertService insertService,
    IMerchantsReadService merchantsReadService,
    IMerchantsInsertService merchantsInsertService,
    IRecommendationBuilderBusiness recommendationBuilder,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IBillingReadBusiness billingReadBusiness,
    INotificationGateService gateService,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    GeoValidator validator,
    IUnitOfWork unitOfWork,
    ILogger<FoursquareWebhookBusiness> logger) : IFoursquareWebhookBusiness
{
    private const decimal AssumedSpendAmount = 25m;

    public async Task<BusinessResponse<FoursquareWebhookResult>> HandleEventAsync(
        FoursquareWebhookInput input,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var validation = validator.ValidateWebhookInput(input);
        if (validation.Count > 0)
        {
            return BusinessResponse<FoursquareWebhookResult>.Fail(validation, 400);
        }

        if (await readService.WebhookEventExistsAsync(input.FoursquareEventId, cancellationToken))
        {
            return BusinessResponse<FoursquareWebhookResult>.Ok(
                new FoursquareWebhookResult(true, true, null, null, null));
        }

        var userId = await readService.ResolveUserIdAsync(input.ExternalUserId!, cancellationToken);

        var eventKind = ClassifyEvent(input.EventType);

        int? committedNotificationId = null;
        Guid? committedUserId = null;
        FoursquareWebhookResult finalResult = new(false, false, null, null, null);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            int webhookEventId;
            try
            {
                webhookEventId = await insertService.RecordWebhookEventAsync(input, userId, null, cancellationToken);
            }
            catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
            {
                await tx.RollbackAsync(cancellationToken);
                return BusinessResponse<FoursquareWebhookResult>.Ok(
                    new FoursquareWebhookResult(true, true, null, null, null));
            }

            try
            {
                if (userId is null)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, null, null, "unknown_user", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                var resolvedUserId = userId.Value;

                if (eventKind == FoursquareEventKind.Unsupported)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, null, "unsupported_event", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                if (eventKind == FoursquareEventKind.Exit)
                {
                    var exitMerchant = await ResolveMerchantAsync(input, cancellationToken);
                    await TryWriteLocationEventAsync(resolvedUserId, input, exitMerchant?.Id, GeoConstants.GeofenceExitedLocationEventCode, cancellationToken);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, exitMerchant?.Id, "exit_only", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, exitMerchant?.Id));
                }

                var user = new OnboardingWorkflowUser(resolvedUserId, null);

                var merchant = await ResolveMerchantAsync(input, cancellationToken);
                if (merchant is null)
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchantId: null, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, null, "merchant_not_resolved", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                await TryWriteLocationEventAsync(resolvedUserId, input, merchant.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);

                if (!await readService.HasActiveCardsAsync(resolvedUserId, cancellationToken))
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "no_active_cards", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                var typeId = await readService.GetNotificationTypeIdAsync(NotificationsConstants.BestCardAlertTypeCode, cancellationToken);
                if (typeId == 0)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "notification_type_missing", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                var gate = await gateService.GetGateAsync(resolvedUserId, typeId, DateTimeOffset.UtcNow, cancellationToken);
                if (!gate.ShouldProduce())
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "gated", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                var entitlements = await billingReadBusiness.GetEntitlementsAsync(user, cancellationToken);
                if (entitlements.Data?.GeofencingEnabled != true)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "geofencing_disabled", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                var dailyLimit = entitlements.Data?.GeoRecommendationsPerDay;
                if (dailyLimit.HasValue)
                {
                    var todayUtc = new DateTimeOffset(DateTimeOffset.UtcNow.UtcDateTime.Date, TimeSpan.Zero);
                    var usedToday = await readService.CountGeoRecommendationsSinceAsync(resolvedUserId, todayUtc, cancellationToken);
                    if (usedToday >= dailyLimit.Value)
                    {
                        await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "geo_daily_limit_reached", cancellationToken);
                        await tx.CommitAsync(cancellationToken);
                        return BusinessResponse<FoursquareWebhookResult>.Ok(
                            new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                    }
                }

                var recommendation = await recommendationBuilder.BuildAsync(
                    user,
                    merchant,
                    merchant.CategoryCode,
                    AssumedSpendAmount,
                    RecommendationsConstants.GeofenceArrivalContextCode,
                    cancellationToken);

                if (recommendation is null)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "no_eligible_cards", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                var (title, body) = BuildNotificationContent(recommendation, merchant);
                var notification = new NotificationEntity
                {
                    UserId = resolvedUserId,
                    NotificationTypeId = typeId,
                    Title = title,
                    Body = body,
                    Payload = null,
                    IsRead = false,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                var notificationId = await insertService.InsertNotificationAsync(notification, cancellationToken);
                await insertService.UpdateNotificationPayloadAsync(notificationId, PushPayloadBuilder.BestCardAlert(notificationId, recommendation.Id, merchant.Id), cancellationToken);

                await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, null, cancellationToken);
                await tx.CommitAsync(cancellationToken);

                committedNotificationId = notificationId;
                committedUserId = resolvedUserId;
                finalResult = new FoursquareWebhookResult(true, false, notificationId, recommendation.Id, merchant.Id);
            }
            catch
            {
                await tx.RollbackAsync(cancellationToken);
                throw;
            }
        }

        if (committedNotificationId is { } notifId && committedUserId is { } uid)
        {
            try
            {
                await dispatchBusiness.DispatchPushAsync(notifId, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Push dispatch failed for foursquare best-card notification {NotificationId}", notifId);
            }

            try
            {
                await inboxCacheInvalidator.InvalidateAsync(uid, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after foursquare best-card notification {NotificationId}", uid, notifId);
            }
        }

        return BusinessResponse<FoursquareWebhookResult>.Ok(finalResult);
    }

    private async Task<Merchant?> ResolveMerchantAsync(FoursquareWebhookInput input, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(input.GeofenceTag))
        {
            var tag = input.GeofenceTag.Trim();
            if (tag.StartsWith("merchant_id:", StringComparison.OrdinalIgnoreCase)
                && int.TryParse(tag.AsSpan("merchant_id:".Length), NumberStyles.Integer, CultureInfo.InvariantCulture, out var taggedId))
            {
                var byTag = await merchantsReadService.GetMerchantAsync(taggedId, cancellationToken);
                if (byTag is not null) return byTag;
            }
        }

        var name = !string.IsNullOrWhiteSpace(input.PlaceChain) ? input.PlaceChain : input.PlaceName;
        if (string.IsNullOrWhiteSpace(name)) return null;

        var existing = await merchantsReadService.FindByNameAsync(name, cancellationToken);
        if (existing is not null) return existing;

        var category = await merchantsReadService.ResolveCategoryAsync(name, cancellationToken);
        return await merchantsInsertService.SaveMerchantAsync(
            name,
            provider: "foursquare",
            providerPlaceId: null,
            categoryCode: category.CategoryCode,
            isMultiCategory: category.IsMultiCategory,
            address: null,
            cancellationToken);
    }

    private async Task TryWriteLocationEventAsync(Guid userId, FoursquareWebhookInput input, int? merchantId, string locationEventCode, CancellationToken cancellationToken)
    {
        if (input.Lat is null || input.Lng is null) return;
        var typeId = await readService.GetLocationEventTypeIdAsync(locationEventCode, cancellationToken);
        if (typeId == 0) return;
        var now = DateTimeOffset.UtcNow;
        await insertService.InsertLocationEventAsync(new LocationEventEntity
        {
            UserId = userId,
            Lat = input.Lat.Value,
            Lng = input.Lng.Value,
            AccuracyMeters = input.AccuracyMeters,
            MerchantId = merchantId,
            EventTypeId = typeId,
            OccurredAt = input.OccurredAt == default ? now : input.OccurredAt,
            CreatedAt = now
        }, cancellationToken);
    }

    private static FoursquareEventKind ClassifyEvent(string? eventType)
    {
        if (string.IsNullOrWhiteSpace(eventType)) return FoursquareEventKind.Unsupported;
        return eventType switch
        {
            GeoConstants.FoursquareEventEnteredGeofence => FoursquareEventKind.Arrival,
            GeoConstants.FoursquareEventEnteredPlace => FoursquareEventKind.Arrival,
            GeoConstants.FoursquareEventExitedGeofence => FoursquareEventKind.Exit,
            _ => FoursquareEventKind.Unsupported,
        };
    }

    private enum FoursquareEventKind
    {
        Unsupported,
        Arrival,
        Exit
    }

    private static (string Title, string Body) BuildNotificationContent(Recommendation recommendation, Merchant merchant)
    {
        var card = recommendation.RecommendedCard.Card;
        var title = $"Use {card.DisplayName} at {merchant.Name}";
        var rate = recommendation.RecommendedCard.ExpectedRewardRate;
        var body = rate > 0m
            ? $"Earn {rate:0.#}x rewards on this purchase."
            : "Tap to see the best card for this stop.";
        return (title, body);
    }

    #region archive — async event-publish (disabled in MVP)
    // HandleEventAsync previously published NotificationCreated to the messaging outbox when a
    // best-card alert notification was inserted. Consumers (2): NotificationCreatedHandler →
    // DispatchPushAsync; InboxCacheInvalidatorHandler → InvalidateAsync. Both now inline post-commit.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // Inside the committing tx, after UpdateNotificationPayloadAsync:
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationCreated,
    //     "notification",
    //     notificationId,
    //     JsonSerializer.Serialize(new NotificationCreatedEventContract(1, notificationId, resolvedUserId)),
    //     $"foursquare.{input.FoursquareEventId}",
    //     cancellationToken);
    #endregion
}
