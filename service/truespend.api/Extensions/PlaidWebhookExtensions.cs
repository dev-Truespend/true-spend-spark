using TrueSpend.Api.Filters;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Services.Plaid;

namespace TrueSpend.Api.Extensions;

public static class PlaidWebhookExtensions
{
    public static IServiceCollection AddPlaidWebhook(this IServiceCollection services)
    {
        services.AddScoped<IPlaidWebhookService, PlaidWebhookService>();
        services.AddScoped<IPlaidWebhookBusiness, PlaidWebhookBusiness>();
        services.AddScoped<ICardsCacheInvalidatorBusiness, CardsCacheInvalidatorBusiness>();
        services.AddScoped<IPlaidReauthNotificationBusiness, PlaidReauthNotificationBusiness>();
        services.AddScoped<IPlaidNewAccountsNotificationBusiness, PlaidNewAccountsNotificationBusiness>();
        services.AddScoped<PlaidSignatureFilter>();
        return services;
    }
}
