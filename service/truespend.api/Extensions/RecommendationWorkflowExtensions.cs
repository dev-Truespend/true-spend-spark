using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Merchants;
using TrueSpend.Domain.Business.Recommendations;
using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.BusinessInterfaces.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.Services.Merchants;
using TrueSpend.Domain.Services.Recommendations;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class RecommendationWorkflowExtensions
{
    public static IServiceCollection AddRecommendationWorkflow(this IServiceCollection services)
    {
        services.AddScoped<IMerchantsReadService, MerchantsReadService>();
        services.AddScoped<IMerchantsInsertService, MerchantsInsertService>();
        services.AddScoped<IRecommendationsReadService, RecommendationsReadService>();
        services.AddScoped<IRecommendationsInsertService, RecommendationsInsertService>();
        services.AddScoped<IRewardRulesReadService, RewardRulesReadService>();

        services.AddScoped<IRecommendationBuilderBusiness, RecommendationBuilderBusiness>();
        services.AddScoped<IRecommendationsReadBusiness, RecommendationsReadBusiness>();
        services.AddScoped<IRecommendationsInsertBusiness, RecommendationsInsertBusiness>();
        services.AddScoped<IRecommendationsUpdateBusiness, RecommendationsUpdateBusiness>();
        services.AddScoped<IMerchantsReadBusiness, MerchantsReadBusiness>();
        services.AddScoped<IMerchantsInsertBusiness, MerchantsInsertBusiness>();

        services.AddScoped<MerchantsValidator>();
        services.AddScoped<RecommendationsValidator>();

        services.AddScoped<IMerchantsMapper, MerchantsMapper>();
        services.AddScoped<IRecommendationsMapper, RecommendationsMapper>();
        return services;
    }
}
