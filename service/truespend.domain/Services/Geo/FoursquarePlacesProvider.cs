using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;

namespace TrueSpend.Domain.Services.Geo;

public sealed class FoursquarePlacesProviderOptions
{
    public string BaseUrl { get; set; } = "https://api.foursquare.com";
    public string PlacesApiKey { get; set; } = string.Empty;
}

// Real Foursquare Places API v3 client (GET /v3/places/search). Registered only when a Places API
// key is configured; otherwise the placeholder is used. Pagination uses the provider cursor where
// present (MVP returns a single page per call — the catalog job tiles by region/category).
public sealed class FoursquarePlacesProvider(HttpClient httpClient) : IFoursquarePlacesProvider
{
    private const string ProviderName = "foursquare";

    public async Task<ProviderPlacesPage> SearchPlacesAsync(
        IReadOnlyCollection<string> foursquareCategoryIds,
        string region,
        string? cursor,
        int batchSize,
        CancellationToken cancellationToken)
    {
        try
        {
            var query = $"/v3/places/search?categories={Uri.EscapeDataString(string.Join(",", foursquareCategoryIds))}" +
                        $"&near={Uri.EscapeDataString(region)}&limit={Math.Clamp(batchSize, 1, 50)}";
            if (!string.IsNullOrWhiteSpace(cursor))
            {
                query += $"&cursor={Uri.EscapeDataString(cursor)}";
            }
            var response = await httpClient.GetFromJsonAsync<FsqSearchResponse>(query, cancellationToken);
            var places = (response?.Results ?? new List<FsqResult>()).Select(MapResult).ToList();
            return new ProviderPlacesPage(places, null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, $"Foursquare places search failed for region '{region}'.", ex);
        }
    }

    public async Task<IReadOnlyList<ProviderPlace>> NearbySearchAsync(
        decimal lat,
        decimal lng,
        int radiusMeters,
        IReadOnlyCollection<string> foursquareCategoryIds,
        CancellationToken cancellationToken)
    {
        try
        {
            var ll = $"{lat.ToString(System.Globalization.CultureInfo.InvariantCulture)},{lng.ToString(System.Globalization.CultureInfo.InvariantCulture)}";
            var query = $"/v3/places/search?ll={Uri.EscapeDataString(ll)}&radius={radiusMeters}&limit=10";
            if (foursquareCategoryIds.Count > 0)
            {
                query += $"&categories={Uri.EscapeDataString(string.Join(",", foursquareCategoryIds))}";
            }
            var response = await httpClient.GetFromJsonAsync<FsqSearchResponse>(query, cancellationToken);
            return (response?.Results ?? new List<FsqResult>()).Select(MapResult).ToList();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, "Foursquare nearby search failed.", ex);
        }
    }

    private static ProviderPlace MapResult(FsqResult r)
    {
        var category = r.Categories?.FirstOrDefault();
        var chain = r.Chains?.FirstOrDefault();
        return new ProviderPlace(
            ProviderName,
            r.FsqId ?? string.Empty,
            r.Name ?? string.Empty,
            chain?.Id,
            chain?.Name,
            category?.Id,
            category?.Name,
            r.Geocodes?.Main?.Latitude ?? 0m,
            r.Geocodes?.Main?.Longitude ?? 0m,
            r.Location?.Address,
            r.Location?.Locality,
            r.Location?.Region,
            r.Location?.Postcode,
            r.Location?.Country);
    }

    private sealed class FsqSearchResponse
    {
        [JsonPropertyName("results")] public List<FsqResult>? Results { get; set; }
    }

    private sealed class FsqResult
    {
        [JsonPropertyName("fsq_id")] public string? FsqId { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
        [JsonPropertyName("categories")] public List<FsqCategory>? Categories { get; set; }
        [JsonPropertyName("chains")] public List<FsqChain>? Chains { get; set; }
        [JsonPropertyName("location")] public FsqLocation? Location { get; set; }
        [JsonPropertyName("geocodes")] public FsqGeocodes? Geocodes { get; set; }
    }

    private sealed class FsqCategory
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    private sealed class FsqChain
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }

    private sealed class FsqLocation
    {
        [JsonPropertyName("address")] public string? Address { get; set; }
        [JsonPropertyName("locality")] public string? Locality { get; set; }
        [JsonPropertyName("region")] public string? Region { get; set; }
        [JsonPropertyName("postcode")] public string? Postcode { get; set; }
        [JsonPropertyName("country")] public string? Country { get; set; }
    }

    private sealed class FsqGeocodes
    {
        [JsonPropertyName("main")] public FsqLatLng? Main { get; set; }
    }

    private sealed class FsqLatLng
    {
        [JsonPropertyName("latitude")] public decimal Latitude { get; set; }
        [JsonPropertyName("longitude")] public decimal Longitude { get; set; }
    }
}
