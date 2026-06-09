using TrueSpend.Api.Mappers;
using TrueSpend.Domain.ServiceInterfaces.App;
using TrueSpend.Domain.Services.App;
using TrueSpend.Domain.Business.Billing;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.Business.Devices;
using TrueSpend.Domain.Business.NotificationSettings;
using TrueSpend.Domain.Business.Onboarding;
using TrueSpend.Domain.Business.Permissions;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.BusinessInterfaces.Devices;
using TrueSpend.Domain.BusinessInterfaces.NotificationSettings;
using TrueSpend.Domain.BusinessInterfaces.Onboarding;
using TrueSpend.Domain.BusinessInterfaces.Permissions;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.ServiceInterfaces.Cards;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Services.Billing;
using TrueSpend.Domain.Services.Cards;
using TrueSpend.Domain.Services.Catalog;
using TrueSpend.Domain.Services.Devices;
using TrueSpend.Domain.Services.Messaging;
using TrueSpend.Domain.Services.NotificationSettings;
using TrueSpend.Domain.Services.Onboarding;
using TrueSpend.Domain.Services.Permissions;
using TrueSpend.Domain.Services.Persistence;
using TrueSpend.Domain.Services.Plaid;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class OnboardingWorkflowExtensions
{
    public static IServiceCollection AddOnboardingWorkflow(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IMessagingInsertService, MessagingInsertService>();

        services.AddScoped<IOnboardingReadService, OnboardingReadService>();
        services.AddScoped<IOnboardingUpdateService, OnboardingUpdateService>();
        services.AddScoped<ICardsReadService, CardsReadService>();
        services.AddScoped<ICardsInsertService, CardsInsertService>();
        services.AddScoped<ICardsUpdateService, CardsUpdateService>();
        services.AddScoped<ICardsDeleteService, CardsDeleteService>();
        services.AddScoped<ICatalogReadService, CatalogReadService>();
        services.AddScoped<ICatalogInsertService, CatalogInsertService>();
        services.AddScoped<IPlaidInsertService, PlaidInsertService>();
        services.AddScoped<IPlaidReadService, PlaidReadService>();
        services.AddScoped<IPlaidUpdateService, PlaidUpdateService>();
        services.AddScoped<IPermissionsReadService, PermissionsReadService>();
        services.AddScoped<IPermissionsUpdateService, PermissionsUpdateService>();
        services.AddScoped<IBillingReadService, BillingReadService>();
        services.AddScoped<IBillingInsertService, BillingInsertService>();
        services.AddScoped<IBillingUpdateService, BillingUpdateService>();
        services.AddScoped<IStripeWebhookService, StripeWebhookService>();
        services.AddScoped<INotificationSettingsReadService, NotificationSettingsReadService>();
        services.AddScoped<INotificationSettingsUpdateService, NotificationSettingsUpdateService>();
        services.AddScoped<IDevicesInsertService, DevicesInsertService>();
        services.AddScoped<IDevicesUpdateService, DevicesUpdateService>();

        services.AddScoped<IOnboardingReadBusiness, OnboardingReadBusiness>();
        services.AddScoped<IOnboardingUpdateBusiness, OnboardingUpdateBusiness>();
        services.AddScoped<IPlaidInsertBusiness, PlaidInsertBusiness>();
        services.AddScoped<IPlaidCardCatalogMatchBusiness, PlaidCardCatalogMatchBusiness>();
        services.AddScoped<IPermissionsUpdateBusiness, PermissionsUpdateBusiness>();
        services.AddScoped<INotificationSettingsReadBusiness, NotificationSettingsReadBusiness>();
        services.AddScoped<INotificationSettingsUpdateBusiness, NotificationSettingsUpdateBusiness>();
        services.AddScoped<IDevicesInsertBusiness, DevicesInsertBusiness>();
        services.AddScoped<IDevicesUpdateBusiness, DevicesUpdateBusiness>();
        services.AddScoped<ICardsReadBusiness, CardsReadBusiness>();
        services.AddScoped<ICardsInsertBusiness, CardsInsertBusiness>();
        services.AddScoped<ICardsUpdateBusiness, CardsUpdateBusiness>();
        services.AddScoped<ICardsDeleteBusiness, CardsDeleteBusiness>();
        services.AddScoped<IPlaidReadBusiness, PlaidReadBusiness>();
        services.AddScoped<IUserDailyUsageService, UserDailyUsageService>();
        services.AddScoped<IManualResyncQuotaBusiness, ManualResyncQuotaBusiness>();
        services.AddScoped<IPlaidUpdateBusiness, PlaidUpdateBusiness>();
        services.AddScoped<ICatalogReadBusiness, CatalogReadBusiness>();
        services.AddScoped<ICatalogInsertBusiness, CatalogInsertBusiness>();
        services.AddScoped<IBillingReadBusiness, BillingReadBusiness>();
        services.AddScoped<IBillingInsertBusiness, BillingInsertBusiness>();
        services.AddScoped<IEntitlementGuard, EntitlementGuard>();
        services.AddScoped<IStripeWebhookBusiness, StripeWebhookBusiness>();
        services.AddScoped<IEntitlementCacheInvalidatorBusiness, EntitlementCacheInvalidatorBusiness>();
        services.AddScoped<IBillingPaymentMethodCacheInvalidatorBusiness, BillingPaymentMethodCacheInvalidatorBusiness>();
        services.AddScoped<TrueSpend.Api.Filters.StripeSignatureFilter>();

        services.AddScoped<OnboardingValidator>();
        services.AddScoped<PlaidValidator>();
        services.AddScoped<PermissionsValidator>();
        services.AddScoped<BillingValidator>();
        services.AddScoped<NotificationsValidator>();
        services.AddScoped<DevicesValidator>();
        services.AddScoped<CardsValidator>();
        services.AddScoped<CatalogValidator>();

        services.AddScoped<IOnboardingMapper, OnboardingMapper>();
        services.AddScoped<ICardsMapper, CardsMapper>();
        services.AddScoped<ICatalogMapper, CatalogMapper>();
        services.AddScoped<IPlaidMapper, PlaidMapper>();
        services.AddScoped<IPermissionsMapper, PermissionsMapper>();
        services.AddScoped<IBillingMapper, BillingMapper>();
        services.AddScoped<INotificationSettingsMapper, NotificationSettingsMapper>();
        services.AddScoped<IDevicesMapper, DevicesMapper>();

        return services;
    }
}
