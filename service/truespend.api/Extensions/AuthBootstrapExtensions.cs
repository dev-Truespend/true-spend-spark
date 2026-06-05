using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Auth;
using TrueSpend.Domain.BusinessInterfaces.Auth;
using TrueSpend.Domain.ServiceInterfaces.Auth;
using TrueSpend.Domain.Services.Auth;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class AuthBootstrapExtensions
{
    public static IServiceCollection AddAuthBootstrap(this IServiceCollection services)
    {
        services.AddScoped<IAuthBootstrapService, AuthBootstrapService>();
        services.AddScoped<IAuthBootstrapBusiness, AuthBootstrapBusiness>();
        services.AddScoped<AuthBootstrapValidator>();
        services.AddScoped<IAuthBootstrapMapper, AuthBootstrapMapper>();
        services.AddScoped<IClientResponseMapper, ClientResponseMapper>();
        services.AddScoped<IWorkflowUserMapper, WorkflowUserMapper>();
        return services;
    }
}
