namespace TrueSpend.Domain.Models.Geo;

// A region the device should monitor with a native OS geofence (item 8). Identifier is stable per place
// so the client can diff against what it already monitors.
public sealed record MonitoredRegion(
    string Identifier,
    decimal Lat,
    decimal Lng,
    double RadiusMeters);
