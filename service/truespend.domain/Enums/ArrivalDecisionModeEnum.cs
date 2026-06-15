namespace TrueSpend.Domain.Enums;

// What SITUATION the arrival is — orthogonal to ArrivalConfidenceTierEnum (which says how confident /
// whether to act). Mode picks the notification SHAPE; tier gates whether it fires. Today's behavior maps:
//   SingleMerchant -> High      (one clear close store; lock-screen best-card push)
//   AreaCluster    -> Medium    (2-5 plausible close places; foreground list now, grouped push later)
//   NearButNotAt   -> Medium    (closest plausible place is beyond the proximity AT-gate)
//   MallArea       -> Low+dense (many plausible places packed in the proximity radius)
//   Unknown        -> Low/None  (coarse fix, failed gate, or nothing resolved)
//   PersonalPlace  -> reserved  (home/work suppression; populated once recurring-dwell detection lands)
public enum ArrivalDecisionModeEnum
{
    Unknown = 0,
    SingleMerchant = 1,
    AreaCluster = 2,
    MallArea = 3,
    NearButNotAt = 4,
    PersonalPlace = 5
}
