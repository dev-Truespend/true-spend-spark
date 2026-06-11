using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.BusinessInterfaces.Geo;

// The shared, provider-neutral arrival handler. Both ingress paths map their transport into a
// GeoArrivalInput and call this: foursquare webhook (FoursquareWebhookBusiness) and the custom
// device JWT endpoint (GeoArrivalController). Owns dedup -> merchant resolution -> gate -> best card
// -> notification insert -> post-commit push/cache, identical for both providers.
public interface IGeoArrivalBusiness
{
    Task<BusinessResponse<FoursquareWebhookResult>> HandleArrivalAsync(
        GeoArrivalInput input,
        CancellationToken cancellationToken);
}
