using Going.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Services.Plaid;

namespace TrueSpend.Api.Extensions;

public static class PlaidProviderExtensions
{
    public static IServiceCollection AddPlaidProvider(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("Plaid");
        var providerOptions = new PlaidProviderOptions();
        section.Bind(providerOptions);
        services.Configure<PlaidProviderOptions>(section);

        services.AddMemoryCache();

        if (string.IsNullOrWhiteSpace(providerOptions.ClientId) || string.IsNullOrWhiteSpace(providerOptions.Secret))
        {
            services.AddScoped<IPlaidProvider, PlaidPlaceholderProvider>();
            services.AddScoped<IPlaidWebhookKeyProvider, PlaidWebhookKeyPlaceholderProvider>();
            return services;
        }

        services.Configure<PlaidOptions>(opt =>
        {
            opt.ClientId = providerOptions.ClientId;
            opt.Secret = providerOptions.Secret;
            opt.Environment = providerOptions.Environment.ToLowerInvariant() switch
            {
                "production" => Going.Plaid.Environment.Production,
                "development" => Going.Plaid.Environment.Development,
                _ => Going.Plaid.Environment.Sandbox
            };
        });
        services.AddPlaidClient();
        services.AddSingleton<PlaidClient>();
        services.AddScoped<IPlaidProvider, PlaidProvider>();
        services.AddHttpClient<IPlaidWebhookKeyProvider, PlaidWebhookKeyProvider>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(10);
        });
        return services;
    }
}
