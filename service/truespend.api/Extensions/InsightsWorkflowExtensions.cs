using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.Business.Analytics;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.Services.AIInsights;
using TrueSpend.Domain.Services.Analytics;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class InsightsWorkflowExtensions
{
    public static IServiceCollection AddInsightsWorkflow(this IServiceCollection services)
    {
        services.AddScoped<IAnalyticsReadService, AnalyticsReadService>();
        services.AddScoped<IAIInsightsReadService, AIInsightsReadService>();
        services.AddScoped<IAIInsightsInsertService, AIInsightsInsertService>();
        services.AddScoped<IAIInsightsUpdateService, AIInsightsUpdateService>();

        services.AddScoped<IAnalyticsReadBusiness, AnalyticsReadBusiness>();
        services.AddScoped<IAIInsightsReadBusiness, AIInsightsReadBusiness>();
        services.AddScoped<IAIInsightsInsertBusiness, AIInsightsInsertBusiness>();
        services.AddScoped<IAIInsightsUpdateBusiness, AIInsightsUpdateBusiness>();

        services.AddScoped<AnalyticsValidator>();

        services.AddScoped<IAnalyticsMapper, AnalyticsMapper>();
        services.AddScoped<IAIInsightsMapper, AIInsightsMapper>();

        return services;
    }
}
