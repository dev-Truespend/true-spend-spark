using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Privacy;
using TrueSpend.Domain.BusinessInterfaces.Privacy;
using TrueSpend.Domain.Models.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Privacy;
using TrueSpend.Domain.Services.Privacy;

namespace TrueSpend.Api.Extensions;

public static class PrivacyWorkflowExtensions
{
    public static IServiceCollection AddPrivacyWorkflow(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<PrivacyOptions>(configuration.GetSection("Privacy"));

        services.AddScoped<IAccountDeletionService, AccountDeletionService>();
        services.AddScoped<IAccountDeletionRequestBusiness, AccountDeletionRequestBusiness>();
        services.AddScoped<IAccountDeletionMapper, AccountDeletionMapper>();

        return services;
    }
}
