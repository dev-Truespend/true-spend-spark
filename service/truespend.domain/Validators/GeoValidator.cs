using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.Validators;

public sealed class GeoValidator
{
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
