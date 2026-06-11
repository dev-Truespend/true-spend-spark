namespace TrueSpend.Domain.Models.Geo;

public sealed record FoursquareCatalogSyncResult(
    string Status,
    string Mode,
    int Processed,
    int PlacesCreated,
    int PlacesUpdated,
    int ChainsCreated,
    int ChainsUpdated,
    int SkippedByCategoryFilter);
