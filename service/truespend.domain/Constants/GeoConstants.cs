namespace TrueSpend.Domain.Constants;

public static class GeoConstants
{
    public const string GeofenceEnteredLocationEventCode = "geofence_entered";
    public const string GeofenceExitedLocationEventCode = "geofence_exited";

    public const string FoursquareEventEnteredGeofence = "user.entered_geofence";
    public const string FoursquareEventEnteredPlace = "user.entered_place";
    public const string FoursquareEventExitedGeofence = "user.exited_geofence";

    // Provider tags (10a). Both ingress endpoints map to the shared GeoArrivalInput.Provider.
    public const string ProviderFoursquare = "foursquare";
    public const string ProviderCustom = "custom";

    // Custom-path arrival event types (transport).
    public const string CustomEventArrival = "arrival";

    // Movement states reported by the custom client (feed candidate ranking).
    public const string MovementOnFoot = "on_foot";
    public const string MovementInVehicle = "in_vehicle";
    public const string MovementStill = "still";
    public const string MovementUnknown = "unknown";

    // Approximate-arrival -> candidate ranking thresholds (custom path place matching).
    public const decimal AccuracyPreciseThresholdMeters = 30m;   // <= : tight fix
    public const decimal AccuracyCoarseThresholdMeters = 75m;    // > : too coarse, low-confidence only
    public const int NearbyRadiusPreciseMeters = 100;            // search radius for a tight fix
    public const int NearbyRadiusCoarseMeters = 150;             // search radius for a wider fix
    public const double HighConfidenceMarginMeters = 60d;        // top vs 2nd gap that clears "High"
    public const int DenseLotCandidateThreshold = 10;            // >= candidates in range => ambiguous lot
    public const int MinDwellSecondsForVehicle = 60;             // shorter in-vehicle stop => likely drive-by
}
