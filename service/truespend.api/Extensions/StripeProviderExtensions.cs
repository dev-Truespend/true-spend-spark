using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.Services.Billing;

namespace TrueSpend.Api.Extensions;

public static class StripeProviderExtensions
{
    public static IServiceCollection AddStripeProvider(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection("Stripe");
        var providerOptions = new StripeProviderOptions();
        section.Bind(providerOptions);
        services.Configure<StripeProviderOptions>(section);

        if (string.IsNullOrWhiteSpace(providerOptions.SecretKey))
        {
            services.AddScoped<IStripeProvider, StripePlaceholderProvider>();
            return services;
        }

        services.AddScoped<IStripeProvider, StripeProvider>();
        return services;
    }
}
