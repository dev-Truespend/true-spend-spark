using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.BusinessInterfaces.Merchants;
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
    IMerchantResolveBusiness merchantResolve,
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
                    // Leaving the area closes any covering session now, instead of waiting out its TTL — so
                    // re-entering later (or a fresh nearby arrival) is treated as a new visit (item 8).
                    if (input.Lat is { } exitLat && input.Lng is { } exitLng)
                    {
                        await insertService.ExpireCoveringAreaSessionsAsync(resolvedUserId, exitLat, exitLng, DateTimeOffset.UtcNow, cancellationToken);
                    }
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, exitMerchant?.Id, "exit_only", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, exitMerchant?.Id));
                }

                var user = new OnboardingWorkflowUser(resolvedUserId, null);

                var (merchant, tier, candidateCount, plausibleCount, mode, candidates) = await ResolveArrivalMerchantAsync(input, cancellationToken);

                // One decision-telemetry row per resolved arrival — the outcome + the situation/density
                // signals behind it — so the confidence thresholds can be tuned from real data, not guesses.
                async Task RecordDecisionAsync(int? decisionMerchantId, string outcome, bool notificationProduced) =>
                    await insertService.InsertArrivalDecisionAsync(new GeoArrivalDecisionEntity
                    {
                        WebhookEventId = webhookEventId,
                        UserId = resolvedUserId,
                        Provider = input.Provider,
                        EventId = input.EventId,
                        Lat = input.Lat,
                        Lng = input.Lng,
                        AccuracyMeters = input.AccuracyMeters,
                        DwellSeconds = input.DwellSeconds,
                        MovementState = input.MovementState,
                        ConfidenceTier = (short)tier,
                        CandidateCount = candidateCount,
                        PlausibleCount = plausibleCount,
                        ChosenMerchantId = decisionMerchantId,
                        DecisionMode = ArrivalModeCode(mode),
                        DecisionOutcome = outcome,
                        NotificationProduced = notificationProduced,
                        CreatedAt = DateTimeOffset.UtcNow
                    }, cancellationToken);

                // Personal-place suppression: the user is inside a recurring dwell zone (home/work) that
                // happens to sit near stores — never fire best-card pushes while they're simply at home,
                // for any mode (single / cluster / mall). Not a shopping trip, so no visit is recorded.
                if (tier is not ArrivalConfidenceTierEnum.None
                    && input.Lat is { } personalLat && input.Lng is { } personalLng
                    && await readService.IsWithinPersonalPlaceAsync(resolvedUserId, personalLat, personalLng, cancellationToken))
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchant?.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);
                    await RecordDecisionAsync(merchant?.Id, "personal_place_suppressed", false);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant?.Id, "personal_place_suppressed", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant?.Id));
                }

                // Shared push gates (cards / type / quiet-hours+prefs / entitlement / daily cap). Used by
                // both the single and grouped paths so they can never drift.
                async Task<(bool Ok, string? Reason, short TypeId)> CheckPushGatesAsync()
                {
                    if (!await readService.HasActiveCardsAsync(resolvedUserId, cancellationToken))
                        return (false, "no_active_cards", 0);
                    var gateTypeId = await readService.GetNotificationTypeIdAsync(NotificationsConstants.BestCardAlertTypeCode, cancellationToken);
                    if (gateTypeId == 0)
                        return (false, "notification_type_missing", 0);
                    var gate = await gateService.GetGateAsync(resolvedUserId, gateTypeId, DateTimeOffset.UtcNow, cancellationToken);
                    if (!gate.ShouldProduce())
                        return (false, "gated", gateTypeId);
                    var entitlements = await billingReadBusiness.GetEntitlementsAsync(user, cancellationToken);
                    if (entitlements.Data?.GeofencingEnabled != true)
                        return (false, "geofencing_disabled", gateTypeId);
                    var dailyLimit = entitlements.Data?.GeoRecommendationsPerDay;
                    if (dailyLimit.HasValue)
                    {
                        var todayUtc = new DateTimeOffset(DateTimeOffset.UtcNow.UtcDateTime.Date, TimeSpan.Zero);
                        var usedToday = await readService.CountGeoRecommendationsSinceAsync(resolvedUserId, todayUtc, cancellationToken);
                        if (usedToday >= dailyLimit.Value)
                            return (false, "geo_daily_limit_reached", gateTypeId);
                    }
                    return (true, null, gateTypeId);
                }

                // Grouped/area situation (AreaCluster = 2-5 plausible close places; MallArea = dense lot).
                // Send ONE hedged push listing the best card for the top nearby stores — never a single
                // guessed merchant — and open an area session so individual in-area arrivals are then
                // suppressed. The foreground "nearby best cards" list (03) is the in-app sibling surface.
                if (mode is ArrivalDecisionModeEnum.AreaCluster or ArrivalDecisionModeEnum.MallArea)
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchant?.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);

                    // Cluster resolved a closest merchant (Medium) — record that physical visit. A dense
                    // mall (Low) has no single store to attribute, so no visit row.
                    if (merchant is not null)
                    {
                        var clusterVisitedAt = input.OccurredAt == default ? DateTimeOffset.UtcNow : input.OccurredAt;
                        await merchantsInsertService.RecordVisitAsync(user, merchant.Id, merchant.CategoryCode, clusterVisitedAt, cancellationToken);
                    }

                    // Already inside an active area session we pushed for → suppress the re-push (visit kept).
                    if (input.Lat is { } gLat && input.Lng is { } gLng
                        && await readService.HasCoveringAreaSessionAsync(resolvedUserId, gLat, gLng, DateTimeOffset.UtcNow, cancellationToken))
                    {
                        await RecordDecisionAsync(merchant?.Id, "area_session_suppressed", false);
                        await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant?.Id, "area_session_suppressed", cancellationToken);
                        await tx.CommitAsync(cancellationToken);
                        return BusinessResponse<FoursquareWebhookResult>.Ok(new FoursquareWebhookResult(true, false, null, null, merchant?.Id));
                    }

                    var groupedGates = await CheckPushGatesAsync();
                    if (!groupedGates.Ok)
                    {
                        await RecordDecisionAsync(merchant?.Id, groupedGates.Reason!, false);
                        await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant?.Id, groupedGates.Reason, cancellationToken);
                        await tx.CommitAsync(cancellationToken);
                        return BusinessResponse<FoursquareWebhookResult>.Ok(new FoursquareWebhookResult(true, false, null, null, merchant?.Id));
                    }

                    var groupedItems = await BuildGroupedItemsAsync(input, user, candidates, cancellationToken);
                    if (groupedItems.Count == 0)
                    {
                        await RecordDecisionAsync(merchant?.Id, "no_eligible_cards", false);
                        await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant?.Id, "no_eligible_cards", cancellationToken);
                        await tx.CommitAsync(cancellationToken);
                        return BusinessResponse<FoursquareWebhookResult>.Ok(new FoursquareWebhookResult(true, false, null, null, merchant?.Id));
                    }

                    // We're now committed to producing the grouped push, so open the session — and ONLY now.
                    // Opening it earlier (before gates/cards) would suppress the rest of this visit's in-area
                    // arrivals even though no push was ever sent (gated, quiet-hours, daily cap, or no eligible
                    // card). Idempotent, so a burst of near-simultaneous arrivals still won't stack sessions.
                    var (sessionMode, sessionTtl) = mode == ArrivalDecisionModeEnum.MallArea
                        ? (GeoConstants.AreaSessionModeMall, GeoConstants.MallAreaSessionTtlMinutes)
                        : (GeoConstants.AreaSessionModeCluster, GeoConstants.AreaClusterSessionTtlMinutes);
                    await TryOpenAreaSessionAsync(resolvedUserId, input, sessionMode, sessionTtl, cancellationToken);

                    var (groupedTitle, groupedBody) = BuildGroupedNotificationContent(groupedItems);
                    var groupedNotification = new NotificationEntity
                    {
                        UserId = resolvedUserId,
                        NotificationTypeId = groupedGates.TypeId,
                        Title = groupedTitle,
                        Body = groupedBody,
                        Payload = null,
                        IsRead = false,
                        CreatedAt = DateTimeOffset.UtcNow,
                        UpdatedAt = DateTimeOffset.UtcNow
                    };
                    var groupedNotificationId = await insertService.InsertNotificationAsync(groupedNotification, cancellationToken);
                    await insertService.UpdateNotificationPayloadAsync(
                        groupedNotificationId,
                        PushPayloadBuilder.GroupedBestCardAlert(groupedNotificationId, groupedItems.Select(i => (i.MerchantId, i.RecommendationId)).ToList()),
                        cancellationToken);

                    var primaryMerchantId = merchant?.Id ?? groupedItems[0].MerchantId;
                    await RecordDecisionAsync(primaryMerchantId, "grouped_pushed", true);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, primaryMerchantId, null, cancellationToken);
                    await tx.CommitAsync(cancellationToken);

                    await DispatchAndInvalidateAsync(groupedNotificationId, resolvedUserId, input.Provider, cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, groupedNotificationId, groupedItems[0].RecommendationId, primaryMerchantId));
                }

                // Low / no confidence (custom dense lot, coarse fix, or nothing matched): log only.
                if (tier is ArrivalConfidenceTierEnum.None or ArrivalConfidenceTierEnum.Low)
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchant?.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);
                    var reason = tier == ArrivalConfidenceTierEnum.None ? "merchant_not_resolved" : "low_confidence";
                    await RecordDecisionAsync(merchant?.Id, reason, false);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant?.Id, reason, cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant?.Id));
                }

                if (merchant is null)
                {
                    await TryWriteLocationEventAsync(resolvedUserId, input, merchantId: null, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);
                    await RecordDecisionAsync(null, "merchant_not_resolved", false);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, null, "merchant_not_resolved", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, null));
                }

                await TryWriteLocationEventAsync(resolvedUserId, input, merchant.Id, GeoConstants.GeofenceEnteredLocationEventCode, cancellationToken);

                // A confident arrival (High or Medium) is a real, physical visit — record it in merchant
                // history regardless of whether a push is ultimately produced. The notification gates
                // below (cards/quiet-hours/entitlement/daily-cap) are a messaging decision, not a record
                // of where the user actually was. Powers home "recent visits" and repeat-visit confidence.
                var visitedAt = input.OccurredAt == default ? DateTimeOffset.UtcNow : input.OccurredAt;
                await merchantsInsertService.RecordVisitAsync(user, merchant.Id, merchant.CategoryCode, visitedAt, cancellationToken);

                // Medium confidence (ambiguous top candidates / shared lot): no lock-screen push — the
                // foreground "nearby best cards" list (03-recommendations) handles it instead.
                if (tier == ArrivalConfidenceTierEnum.Medium)
                {
                    await RecordDecisionAsync(merchant.Id, "medium_confidence_foreground", false);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "medium_confidence_foreground", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                // Area-session suppression: the user is already inside a mall/plaza/cluster (or a personal
                // place) we are tracking — the visit is recorded above, but we don't fire a separate push
                // for this individual store. The area's own notification (item 3/4) already covered them.
                if (input.Lat is { } sessionLat && input.Lng is { } sessionLng
                    && await readService.HasCoveringAreaSessionAsync(resolvedUserId, sessionLat, sessionLng, DateTimeOffset.UtcNow, cancellationToken))
                {
                    await RecordDecisionAsync(merchant.Id, "area_session_suppressed", false);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, "area_session_suppressed", cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }

                var singleGates = await CheckPushGatesAsync();
                if (!singleGates.Ok)
                {
                    await RecordDecisionAsync(merchant.Id, singleGates.Reason!, false);
                    await insertService.MarkWebhookProcessedAsync(webhookEventId, resolvedUserId, merchant.Id, singleGates.Reason, cancellationToken);
                    await tx.CommitAsync(cancellationToken);
                    return BusinessResponse<FoursquareWebhookResult>.Ok(
                        new FoursquareWebhookResult(true, false, null, null, merchant.Id));
                }
                var typeId = singleGates.TypeId;

                var recommendation = await recommendationBuilder.BuildAsync(
                    user,
                    merchant,
                    merchant.CategoryCode,
                    AssumedSpendAmount,
                    RecommendationsConstants.GeofenceArrivalContextCode,
                    cancellationToken);

                if (recommendation is null)
                {
                    await RecordDecisionAsync(merchant.Id, "no_eligible_cards", false);
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

                await RecordDecisionAsync(merchant.Id, "pushed", true);
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
            await DispatchAndInvalidateAsync(notifId, uid, input.Provider, cancellationToken);
        }

        return BusinessResponse<FoursquareWebhookResult>.Ok(finalResult);
    }

    // Post-commit best-effort fan-out (inline, MVP): deliver the push and drop the inbox cache. Failures
    // are logged, never thrown — the notification row is already committed. Shared by the single and
    // grouped/area push paths.
    private async Task DispatchAndInvalidateAsync(int notificationId, Guid userId, string provider, CancellationToken cancellationToken)
    {
        try
        {
            await dispatchBusiness.DispatchPushAsync(notificationId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Push dispatch failed for {Provider} best-card notification {NotificationId}", provider, notificationId);
        }

        try
        {
            await inboxCacheInvalidator.InvalidateAsync(userId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Inbox cache invalidation failed for user {UserId} after {Provider} best-card notification {NotificationId}", userId, provider, notificationId);
        }
    }

    // Branches merchant resolution by provider. Foursquare geofences are trusted (High). The custom
    // path resolves from coordinates with a confidence tier; a wrong push is worse than no push.
    private async Task<ArrivalResolution> ResolveArrivalMerchantAsync(
        GeoArrivalInput input,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(input.Provider, GeoConstants.ProviderCustom, StringComparison.OrdinalIgnoreCase))
        {
            var geofenceMerchant = await ResolveGeofenceMerchantAsync(input, cancellationToken);
            return geofenceMerchant is null
                ? new ArrivalResolution(null, ArrivalConfidenceTierEnum.None, 0, 0, ArrivalDecisionModeEnum.Unknown, EmptyCandidates)
                : new ArrivalResolution(geofenceMerchant, ArrivalConfidenceTierEnum.High, 0, 0, ArrivalDecisionModeEnum.SingleMerchant, EmptyCandidates);
        }

        if (input.Lat is null || input.Lng is null)
        {
            return new ArrivalResolution(null, ArrivalConfidenceTierEnum.None, 0, 0, ArrivalDecisionModeEnum.Unknown, EmptyCandidates);
        }

        var match = await placeMatchBusiness.ResolveAsync(
            input.Lat.Value, input.Lng.Value, input.AccuracyMeters, input.DwellSeconds, input.MovementState, cancellationToken);
        var candidates = match.TopCandidates ?? EmptyCandidates;

        if (!match.HasCandidate || match.Tier is ArrivalConfidenceTierEnum.None or ArrivalConfidenceTierEnum.Low)
        {
            return new ArrivalResolution(null, match.Tier, match.CandidateCount, match.PlausibleCount, match.Mode, candidates);
        }

        // Resolve with the matched place's own provider + place-id pair (not the "custom" transport provider).
        var merchant = await merchantResolve.ResolveByNameAsync(match.Name!, match.Provider ?? input.Provider, match.ProviderPlaceId, address: null, cancellationToken);
        return new ArrivalResolution(merchant, match.Tier, match.CandidateCount, match.PlausibleCount, match.Mode, candidates);
    }

    private static readonly IReadOnlyList<PlaceMatchCandidate> EmptyCandidates = Array.Empty<PlaceMatchCandidate>();

    // Resolved arrival + the density signals behind its tier (counts are 0 on the trusted geofence path).
    // Candidates carries the top plausible places for the grouped/area push (AreaCluster / MallArea).
    private readonly record struct ArrivalResolution(
        Merchant? Merchant,
        ArrivalConfidenceTierEnum Tier,
        int CandidateCount,
        int PlausibleCount,
        ArrivalDecisionModeEnum Mode,
        IReadOnlyList<PlaceMatchCandidate> Candidates);

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
        return await merchantResolve.ResolveByNameAsync(name, input.Provider, input.ProviderPlaceId, address: null, cancellationToken);
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

    // Stable snake_case code for the decision-telemetry column (queryable, decoupled from enum ordinals).
    private static string ArrivalModeCode(ArrivalDecisionModeEnum mode) => mode switch
    {
        ArrivalDecisionModeEnum.SingleMerchant => "single_merchant",
        ArrivalDecisionModeEnum.AreaCluster => "area_cluster",
        ArrivalDecisionModeEnum.MallArea => "mall_area",
        ArrivalDecisionModeEnum.NearButNotAt => "near_but_not_at",
        ArrivalDecisionModeEnum.PersonalPlace => "personal_place",
        _ => "unknown"
    };

    // Opens an area session centered on the arrival, unless one already covers the point (idempotent so a
    // burst of in-mall arrivals doesn't stack sessions). TTL expiry only for now; exit-close lands later.
    private async Task TryOpenAreaSessionAsync(Guid userId, GeoArrivalInput input, string mode, int ttlMinutes, CancellationToken cancellationToken)
    {
        if (input.Lat is not { } lat || input.Lng is not { } lng) return;
        var now = DateTimeOffset.UtcNow;
        if (await readService.HasCoveringAreaSessionAsync(userId, lat, lng, now, cancellationToken)) return;
        await insertService.InsertAreaSessionAsync(new GeoAreaSessionEntity
        {
            UserId = userId,
            CenterLat = lat,
            CenterLng = lng,
            RadiusMeters = (decimal)GeoConstants.AreaSessionRadiusMeters,
            Mode = mode,
            StartedAt = now,
            ExpiresAt = now.AddMinutes(ttlMinutes),
            CreatedAt = now
        }, cancellationToken);
    }

    // Resolves each top candidate to a merchant + best card for the grouped/area push, deduped by card
    // (two nearby stores pointing at the same card collapse to one line). Order follows candidate ranking
    // (closest first). Each resolved candidate produces a real recommendation row, same as the single path.
    private async Task<List<GroupedItem>> BuildGroupedItemsAsync(
        GeoArrivalInput input,
        OnboardingWorkflowUser user,
        IReadOnlyList<PlaceMatchCandidate> candidates,
        CancellationToken cancellationToken)
    {
        var items = new List<GroupedItem>();
        var seenCards = new HashSet<int>();
        foreach (var candidate in candidates)
        {
            // Use the candidate's own provider, not the arrival transport provider (always "custom" here):
            // candidate.Provider + candidate.ProviderPlaceId are a matched pair from the place tables, so
            // resolution stays correct if it ever becomes provider/place-id sensitive.
            var merchant = await merchantResolve.ResolveByNameAsync(candidate.Name, candidate.Provider, candidate.ProviderPlaceId, address: null, cancellationToken);
            if (merchant is null) continue;

            var recommendation = await recommendationBuilder.BuildAsync(
                user, merchant, merchant.CategoryCode, AssumedSpendAmount, RecommendationsConstants.GeofenceArrivalContextCode, cancellationToken);
            if (recommendation is null) continue;

            if (!seenCards.Add(recommendation.RecommendedCard.Card.Id)) continue;
            items.Add(new GroupedItem(merchant.Id, recommendation.Id, merchant.Name, recommendation.RecommendedCard.Card.DisplayName));
        }
        return items;
    }

    private readonly record struct GroupedItem(int MerchantId, int RecommendationId, string MerchantName, string CardDisplayName);

    private static (string Title, string Body) BuildGroupedNotificationContent(IReadOnlyList<GroupedItem> items)
    {
        const string title = "Best cards near you";
        var body = items.Count == 1
            ? $"Use {items[0].CardDisplayName} at {items[0].MerchantName}."
            : string.Join("  ·  ", items.Select(i => $"{i.MerchantName}: {i.CardDisplayName}"));
        return (title, body);
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
