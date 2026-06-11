namespace TrueSpend.Domain.Enums;

// Confidence the resolved merchant is the place the user actually stopped at (10a candidate ranking).
//   High   -> send the lock-screen best-card push.
//   Medium -> ambiguous (shared lot / close candidates): no push, surface the foreground nearby list.
//   Low    -> dense lot / accuracy too coarse / failed a gate: log the arrival only.
//   None   -> no candidate resolved at all.
// The foursquare (geofence) path is always High; only the custom path tiers down.
public enum ArrivalConfidenceTierEnum
{
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3
}
