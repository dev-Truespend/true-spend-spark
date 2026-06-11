using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.Validators;

public sealed class GeoValidator
{
    // Provider-neutral validation for the shared arrival handler. The foursquare path also runs
    // ValidateWebhookInput first (its body shape differs); custom-path identity is from JWT claims.
    public IReadOnlyList<string> ValidateArrivalInput(GeoArrivalInput input)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(input.Provider))
            errors.Add("Arrival provider is required.");
        if (string.IsNullOrWhiteSpace(input.EventId))
            errors.Add("Arrival event id is required.");
        if (string.IsNullOrWhiteSpace(input.EventType))
            errors.Add("Arrival event type is required.");

        if (string.Equals(input.Provider, GeoConstants.ProviderCustom, StringComparison.OrdinalIgnoreCase))
        {
            // The custom path resolves the merchant from coordinates, so a fix is required.
            if (input.Lat is null || input.Lng is null)
                errors.Add("Custom arrival must include latitude and longitude.");
        }
        else
        {
            if (string.IsNullOrWhiteSpace(input.PlaceChain)
                && string.IsNullOrWhiteSpace(input.PlaceName)
                && string.IsNullOrWhiteSpace(input.GeofenceTag))
                errors.Add("Arrival must include a place chain, place name, or geofence tag.");
        }
        return errors;
    }

    public IReadOnlyList<string> ValidateWebhookInput(FoursquareWebhookInput input)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(input.FoursquareEventId))
            errors.Add("Foursquare event id is required.");
        if (string.IsNullOrWhiteSpace(input.EventType))
            errors.Add("Foursquare event type is required.");
        if (string.IsNullOrWhiteSpace(input.ExternalUserId))
            errors.Add("Foursquare event external user id is required.");
        if (string.IsNullOrWhiteSpace(input.PlaceChain)
            && string.IsNullOrWhiteSpace(input.PlaceName)
            && string.IsNullOrWhiteSpace(input.GeofenceTag))
            errors.Add("Foursquare event must include a place chain, place name, or geofence tag.");
        return errors;
    }
}
