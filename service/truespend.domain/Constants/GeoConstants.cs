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
    public const double HighConfidenceMarginMeters = 60d;        // top vs 2nd gap that clears "High" (fast-path)
    public const int DenseLotCandidateThreshold = 10;            // >= candidates in range => ambiguous lot
    public const int MinDwellSecondsForVehicle = 60;             // shorter in-vehicle stop => likely drive-by

    // Dwell-based promotion: a sustained, stationary, tight-fix stop is itself a confident visit even in a
    // clustered lot where no single candidate clears the distance margin — mirrors how stop-detection SDKs
    // (Foursquare/Radar) key confidence off dwell + GPS accuracy rather than the runner-up gap. Tune these
    // two to dial push aggressiveness. HighConfidenceDwellSeconds mirrors the client ARRIVAL_DWELL_MS floor
    // (arrivalStopMath.ts) so any reported arrival can clear it.
    public const int HighConfidenceDwellSeconds = 150;           // >= sustained stationary dwell => confident visit
    public const decimal HighConfidenceAccuracyMeters = 40m;     // fix must be at least this tight to promote on dwell

    // Absolute-proximity gate for a High tier (and its push). Being the closest candidate within the
    // search radius is NOT the same as being AT the place: a lone Chipotle ~90m from where the user is
    // actually dwelling (e.g. at home) would otherwise score High and push. High requires the matched
    // place be genuinely close. Generous enough to cover venue size + modest GPS error, tight enough to
    // reject "a block away". Farther matches fall back to Medium (foreground list, no lock-screen push).
    public const double HighConfidenceProximityMeters = 40d;

    // Drive-up categories are built for sub-minute in-vehicle stops (pull up, transact, leave), so the
    // in-vehicle short-dwell drive-by demotion would wrongly suppress a legitimate arrival. A clear
    // closest candidate in one of these keeps its High tier (and its push) despite a short car stop.
    // Codes are catalog.categories.code (rcc_<rewardsCcCategoryId>, stable across local/prod).
    // Gas Stations only for now: the dining bridge (rcc_160378660) collapses drive-thru fast food with
    // sit-down restaurants, so dining can't be exempted without false drive-by pushes.
    public const string GasStationsCategoryCode = "rcc_1455345350";
    public static readonly IReadOnlySet<string> DriveUpCategoryCodes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { GasStationsCategoryCode };
}
