using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Enums;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Geo;

// Foursquare webhook adapter: validates the Foursquare-shaped body, resolves the user from the signed
// ExternalUserId (the signature is the trust anchor), maps to the neutral GeoArrivalInput, and hands
// off to the shared GeoArrivalBusiness. No recommendation/notification logic lives here anymore.
public sealed class FoursquareWebhookBusiness(
    IGeoWebhookReadService readService,
    IGeoArrivalBusiness geoArrivalBusiness,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    GeoValidator validator) : IFoursquareWebhookBusiness
{
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

        // Identity rule: the foursquare path trusts ExternalUserId from the signed body.
        var userId = await readService.ResolveUserIdAsync(input.ExternalUserId!, cancellationToken);

        var arrival = new GeoArrivalInput(
            Provider: GeoConstants.ProviderFoursquare,
            EventId: input.FoursquareEventId,
            EventType: input.EventType,
            EventKind: ClassifyEvent(input.EventType),
            UserId: userId,
            ExternalUserId: input.ExternalUserId,
            PlaceName: input.PlaceName,
            ProviderPlaceId: null,
            GeofenceTag: input.GeofenceTag,
            PlaceChain: input.PlaceChain,
            Lat: input.Lat,
            Lng: input.Lng,
            AccuracyMeters: input.AccuracyMeters,
            OccurredAt: input.OccurredAt,
            DwellSeconds: null,
            MovementState: null,
            RawPayload: input.RawPayload);

        return await geoArrivalBusiness.HandleArrivalAsync(arrival, cancellationToken);
    }

    private static GeoArrivalEventKindEnum ClassifyEvent(string? eventType) => eventType switch
    {
        GeoConstants.FoursquareEventEnteredGeofence => GeoArrivalEventKindEnum.Arrival,
        GeoConstants.FoursquareEventEnteredPlace => GeoArrivalEventKindEnum.Arrival,
        GeoConstants.FoursquareEventExitedGeofence => GeoArrivalEventKindEnum.Exit,
        _ => GeoArrivalEventKindEnum.Unsupported,
    };

    #region archive — async event-publish (disabled in MVP)
    // The shared GeoArrivalBusiness previously published NotificationCreated to the messaging outbox
    // when a best-card alert was inserted. Consumers (2): NotificationCreatedHandler -> DispatchPushAsync;
    // InboxCacheInvalidatorHandler -> InvalidateAsync. Both now run inline post-commit in GeoArrivalBusiness.
    #endregion
}
