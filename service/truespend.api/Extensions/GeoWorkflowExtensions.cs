using TrueSpend.Api.Filters;
using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.Services.Geo;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class GeoWorkflowExtensions
{
    public static IServiceCollection AddGeoWorkflow(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IGeoWebhookReadService, GeoWebhookReadService>();
        services.AddScoped<IGeoWebhookInsertService, GeoWebhookInsertService>();

        // Shared neutral arrival handler + both ingress adapters (10a).
        services.AddScoped<IGeoArrivalBusiness, GeoArrivalBusiness>();
        services.AddScoped<IFoursquareWebhookBusiness, FoursquareWebhookBusiness>();

        // Native-geofence region supply (item 8): clusters the user's location history into monitored regions.
        services.AddScoped<IGeoMonitoredRegionsBusiness, GeoMonitoredRegionsBusiness>();
        services.AddScoped<IPersonalPlaceService, PersonalPlaceService>();

        // Custom-path place matching (DB-first foursquare.places + provider-on-miss persist).
        services.AddScoped<IGeoPlaceMatchReadService, GeoPlaceMatchReadService>();
        services.AddScoped<IGeoPlaceMatchBusiness, GeoPlaceMatchBusiness>();
        services.AddScoped<IFoursquareCatalogReadService, FoursquareCatalogReadService>();
        services.AddScoped<IFoursquarePlacesWriteService, FoursquarePlacesWriteService>();

        var placesApiKey = configuration["Foursquare:PlacesApiKey"] ?? string.Empty;
        var placesBaseUrl = configuration["Foursquare:BaseUrl"] ?? "https://api.foursquare.com";
        if (!string.IsNullOrWhiteSpace(placesApiKey))
        {
            services.AddHttpClient<IFoursquarePlacesProvider, FoursquarePlacesProvider>(client =>
            {
                client.BaseAddress = new Uri(placesBaseUrl);
                client.DefaultRequestHeaders.Accept.Add(new("application/json"));
                client.DefaultRequestHeaders.Add("Authorization", placesApiKey);
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }
        else
        {
            services.AddScoped<IFoursquarePlacesProvider, FoursquarePlacesPlaceholderProvider>();
        }

        services.AddScoped<GeoValidator>();
        services.AddScoped<IGeoMapper, GeoMapper>();
        services.AddScoped<FoursquareSignatureFilter>();
        return services;
    }
}
