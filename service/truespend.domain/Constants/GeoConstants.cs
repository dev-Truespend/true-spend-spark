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
    public const string CustomEventExit = "exit";

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
    public const int DenseLotCandidateThreshold = 10;            // >= PLAUSIBLE candidates => ambiguous lot
    public const int MinDwellSecondsForVehicle = 60;             // shorter in-vehicle stop => likely drive-by

    // Radius for judging "how crowded is the stop point" and who counts as a competing runner-up. A
    // PLAUSIBLE candidate is one the user could actually be standing at — within this radius of the stop.
    // Density (dense-lot suppression) and the runner-up margin are both measured over plausible candidates
    // only, NOT the full search radius: a standalone store (Wawa) with unrelated POIs scattered 90-150m
    // away across the wider search area is one plausible merchant, not an ambiguous lot, and the far POIs
    // must not pull its margin under the High gap. Slightly wider than the 40m High AT-gate to absorb GPS
    // scatter; far tighter than the 100-150m search radius. Adjacent strip-mall storefronts (~20-45m) stay
    // plausible competitors (=> Medium), while across-the-lot places (>50m) do not block a clear push.
    public const double DenseLotProximityMeters = 50d;

    // No dwell-based promotion: an ambiguous cluster (2+ plausible candidates, Medium tier) is never
    // collapsed into a single guessed merchant on the strength of a long dwell — it stays Medium so the
    // grouped/area push (items 3-4) lists the nearby best cards and the user picks. A single plausible
    // candidate already scores High via the clear margin, so there is nothing left to promote. The mobile
    // ARRIVAL_DWELL_MS floor (arrivalStopMath.ts) still governs WHEN an arrival is reported; the server no
    // longer keys a confidence tier off dwell length (dwell is kept only for telemetry + drive-by demotion).

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

    // Area sessions (item 5): while one is active and covers an arrival point, individual store pushes are
    // suppressed. Radius covers a typical mall/plaza footprint; TTL is the only expiry until exit events
    // (item 8) can close sessions precisely. Mode codes match finance.geo_area_sessions.mode.
    public const double AreaSessionRadiusMeters = 120d;
    public const int MallAreaSessionTtlMinutes = 90;
    public const int AreaClusterSessionTtlMinutes = 30;
    // Grouped/area push (items 3-4): a hedged push listing the best card for up to this many top plausible
    // candidates, deduped by card. Capped low so the notification stays scannable, never a wall of stores.
    public const int GroupedPushMaxCandidates = 3;
    public const string AreaSessionModeMall = "mall_area";
    public const string AreaSessionModeCluster = "area_cluster";
    public const string AreaSessionModePersonal = "personal_place";

    // Personal places (item 6): recurring dwell zones detected from clustered location history. While an
    // arrival falls inside one, pushes are suppressed (the user is at home/work, not shopping). Radius is
    // tighter than an area session (a single dwelling, not a complex). Detection clusters the last N days
    // of location_events on a ~PersonalPlaceGridDecimals grid; a cell with >= MinVisits recurring stops is
    // a dwell zone, capped per user. Kind is a coarse label only — suppression fires for any recurring dwell.
    public const double PersonalPlaceRadiusMeters = 80d;
    public const int PersonalPlaceLookbackDays = 30;
    public const int PersonalPlaceMinVisits = 5;
    public const int PersonalPlaceMaxPerUser = 3;
    public const int PersonalPlaceGridDecimals = 3; // ~111m lat grid for clustering recurring stops
    public const string PersonalPlaceKindRecurringDwell = "recurring_dwell";
    // A dwell zone must recur across at least this many DISTINCT days in the lookback window — not just
    // accumulate raw fixes. A favorite spot hit several times over one busy week (e.g. holiday shopping)
    // stays below this; a real home/work, visited most days, clears it. Binds tighter than MinVisits, so
    // a one-week burst can't mint a permanent suppressor. ~twice-a-week over the 30-day lookback.
    public const int PersonalPlaceMinDistinctDays = 8;
    // A recurring dwell whose center sits within this of an active, rewardable place is a store/gym/coffee
    // shop the user frequents — exactly somewhere we'd WANT to push a best card — not a residence. Such
    // cells are excluded from personal-place suppression. Tight: the dwell must be ON the venue, not merely
    // in the same plaza, so a home next door to a shop is still detected.
    public const double PersonalPlaceKnownMerchantRadiusMeters = 60d;

    // Native geofences (item 8): the server hands the device a capped set of regions to monitor around the
    // user's most-frequented places. iOS monitors at most 20 regions, so stay under that with headroom.
    public const int MonitoredRegionLookbackDays = 60;
    public const int MonitoredRegionMaxCount = 18;
    public const double MonitoredRegionRadiusMeters = 100d;
}
