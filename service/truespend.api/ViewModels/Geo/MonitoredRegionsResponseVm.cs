namespace TrueSpend.Api.ViewModels.Geo;

public sealed record MonitoredRegionsResponseVm(IReadOnlyList<MonitoredRegionVm> Regions);

public sealed record MonitoredRegionVm(string Identifier, decimal Lat, decimal Lng, double RadiusMeters);
