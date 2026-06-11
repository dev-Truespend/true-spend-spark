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
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Geo;

// Provider-neutral arrival pipeline shared by the foursquare webhook and the custom device endpoint.
// Merchant resolution branches by provider (geofence name/tag vs confidence-gated place matching);
// everything downstream (gate -> best card -> notification -> post-commit push/cache) is identical.
public sealed class GeoArrivalBusiness(
    IGeoWebhookReadService readService,
    IGeoWebhookInsertService insertService,
    IMerchantsReadService merchantsReadService,
    IMerchantsInsertService merchantsInsertService,
    IGeoPlaceMatchBusiness placeMatchBusiness,
    IRecommendationBuilderBusiness recommendationBuilder,
    IBillingReadBusiness billingReadBusiness,
    INotificationGateService gateService,
    INotificationsDispatchBusiness dispatchBusiness,
    INotificationInboxCacheInvalidatorBusiness inboxCacheInvalidator,
    GeoValidator validator,
    IUnitOfWork unitOfWork,
    ILogger<GeoArrivalBusiness> logger) : IGeoArrivalBusiness
{
    private const decimal AssumedSpendAmount = 25m;

    public async Task<BusinessResponse<FoursquareWebhookResult>> HandleArrivalAsync(
        GeoArrivalInput input,
        CancellationToken cancellationToken)
    {
        var validation = validator.ValidateArrivalInput(input);
        if (validation.Count > 0)
        {
            return BusinessResponse<FoursquareWebhookResult>.Fail(validation, 400);
        }

        if (await readService.WebhookEventExistsAsync(input.Provider, input.EventId, cancellationToken))
        {
            return BusinessResponse<FoursquareWebhookResult>.Ok(
                new FoursquareWebhookResult(true, true, null, null, null));
        }

        int? committedNotificationId = null;
        Guid? committedUserId = null;
        FoursquareWebhookResult finalResult = new(false, false, null, null, null);

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            int webhookEventId;
            try
            {
                webhookEventId = await insertService.RecordWebhookEventAsync(input, input.UserId, null, cancellationToken);
            }
            catch (DbUpdateException ex) when (PostgresErrors.IsUniqueViolation(ex))
            {
                await tx.RollbackAsync(cancellationToken);
                return BusinessResponse<FoursquareWebhookResult>.Ok(
                    new FoursquareWebhookResult(true, true, null, null, null));
            }

            try
            {
                if (input.UserId is null)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, null, null, "unknown_user", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                var resolvedUserId = input.UserId.Value;

                if (input.EventKind == GeoArrivalEventKindEnum.Unsupported)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, null, "unsupported_event", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                if (input.EventKind == GeoArrivalEventKindEnum.Exit)
                {
                    var exitMerchant = await ResolveGeofenceMerchantAsync(input, cancellationToken);
                    await TryWriteLocationEventAsync(resolvedUserId, input, exitMerchant?.Id, GeoConstants.GeofenceExitedLocationEventCode, cancellationToken);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, exitMerchant?.Id, "exit_only", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, exitMerchant?.Id));
                }

                var user = new OnboardingWorkflowUser(resolvedUserId, null);

                var (merchant, tier) = await ResolveArrivalMerchantAsync(input, cancellationToken);

                // Low / no confidence (custom dense lot, coarse fix, or nothing matched): log only.
                if (tier is ArrivalConfidenceTierEnum.None or ArrivalConfidenceTierEnum.Low)
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchant?.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);
                    var reason = tier == ArrivalConfidenceTierEnum.None ? "merchant_not_resolved" : "low_confidence";
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant?.Id, reason, cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant?.Id));
                }

                if (merchant is null)
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchantId: null, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, null, "merchant_not_resolved", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                await TryWriteLocationEventAsync(resolvedUserId, input, merchant.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);

                // Medium confidence (ambiguous top candidates / shared lot): no lock-screen push — the
                // foreground "nearby best cards" list (03-recommendations) handles it instead.
                if (tier == ArrivalConfidenceTierEnum.Medium)
                {
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "medium_confidence_foreground", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

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
                logger.LogWarning(ex, "Push dispatch failed for {Provider} best-card notification {NotificationId}", input.Provider, notifId);
            }

            try
            {
                await inboxCacheInvalidator.InvalidateAsync(uid, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after {Provider} best-card notification {NotificationId}", uid, input.Provider, notifId);
            }
        }

        return BusinessResponse<FoursquareWebhookResult>.Ok(finalResult);
    }

    // Branches merchant resolution by provider. Foursquare geofences are trusted (High). The custom
    // path resolves from coordinates with a confidence tier; a wrong push is worse than no push.
    private async Task<(Merchant? Merchant, ArrivalConfidenceTierEnum Tier)> ResolveArrivalMerchantAsync(
        GeoArrivalInput input,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(input.Provider, GeoConstants.ProviderCustom, StringComparison.OrdinalIgnoreCase))
        {
            var geofenceMerchant = await ResolveGeofenceMerchantAsync(input, cancellationToken);
            return (geofenceMerchant, geofenceMerchant is null ? ArrivalConfidenceTierEnum.None : ArrivalConfidenceTierEnum.High);
        }

        if (input.Lat is null || input.Lng is null)
        {
            return (null, ArrivalConfidenceTierEnum.None);
        }

        var match = await placeMatchBusiness.ResolveAsync(
            input.Lat.Value, input.Lng.Value, input.AccuracyMeters, input.DwellSeconds, input.MovementState, cancellationToken);

        if (!match.HasCandidate || match.Tier is ArrivalConfidenceTierEnum.None or ArrivalConfidenceTierEnum.Low)
        {
            return (null, match.Tier);
        }

        var merchant = await ResolveMerchantByNameAsync(match.Name!, input.Provider, match.ProviderPlaceId, cancellationToken);
        return (merchant, match.Tier);
    }

    // Foursquare-style resolution: merchant_id geofence tag, else chain/name -> find or create.
    private async Task<Merchant?> ResolveGeofenceMerchantAsync(GeoArrivalInput input, CancellationToken cancellationToken)
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
        return await ResolveMerchantByNameAsync(name, input.Provider, input.ProviderPlaceId, cancellationToken);
    }

    private async Task<Merchant> ResolveMerchantByNameAsync(string name, string provider, string? providerPlaceId, CancellationToken cancellationToken)
    {
        var existing = await merchantsReadService.FindByNameAsync(name, cancellationToken);
        if (existing is not null) return existing;

        var category = await merchantsReadService.ResolveCategoryAsync(name, cancellationToken);
        // provider comes from the event, not a constant, so custom-detected merchants are not mislabeled.
        return await merchantsInsertService.SaveMerchantAsync(
            name,
            provider: provider,
            providerPlaceId: providerPlaceId,
            categoryCode: category.CategoryCode,
            isMultiCategory: category.IsMultiCategory,
            address: null,
            cancellationToken);
    }

    private async Task TryWriteLocationEventAsync(Guid userId, GeoArrivalInput input, int? merchantId, string locationEventCode, CancellationToken cancellationToken)
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
}
