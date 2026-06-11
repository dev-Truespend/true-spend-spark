namespace TrueSpend.Domain.Models.Geo;

// Bound to the top-level "Foursquare" config section. Drives FoursquarePlacesCatalogSyncBusiness.
// Mode mirrors the RewardsCC seed-vs-full pattern: "api" tiles the Places API, "bulk" reads the
// open dataset (bulk is not wired in the MVP cut and falls back to api).
public sealed class FoursquarePlacesCatalogOptions
{
    public const string SectionName = "Foursquare";

    public string PlacesApiKey { get; set; } = string.Empty;
    public string Mode { get; set; } = "api";
    public string[] Regions { get; set; } = [];
    public int BatchSize { get; set; } = 50;
}
