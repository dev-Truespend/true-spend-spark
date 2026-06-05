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
    public static IServiceCollection AddGeoWorkflow(this IServiceCollection services)
    {
        services.AddScoped<IGeoWebhookReadService, GeoWebhookReadService>();
        services.AddScoped<IGeoWebhookInsertService, GeoWebhookInsertService>();
        services.AddScoped<IFoursquareWebhookBusiness, FoursquareWebhookBusiness>();
        services.AddScoped<GeoValidator>();
        services.AddScoped<IGeoMapper, GeoMapper>();
        services.AddScoped<FoursquareSignatureFilter>();
        return services;
    }
}
