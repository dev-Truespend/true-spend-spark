using TrueSpend.Api.Mappers;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Services.Notifications;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Api.Extensions;

public static class NotificationsWorkflowExtensions
{
    public static IServiceCollection AddNotificationsWorkflow(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache();
        services.AddScoped<INotificationsReadService, NotificationsReadService>();
        services.AddScoped<INotificationsUpdateService, NotificationsUpdateService>();
        services.AddScoped<INotificationRemindersService, NotificationRemindersService>();
        services.AddScoped<INotificationProductionService, NotificationProductionService>();
        services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
        services.AddScoped<INotificationGateService, NotificationGateService>();

        services.AddScoped<INotificationsReadBusiness, NotificationsReadBusiness>();
        services.AddScoped<INotificationsUpdateBusiness, NotificationsUpdateBusiness>();
        services.AddScoped<INotificationRemindersBusiness, NotificationRemindersBusiness>();
        services.AddScoped<INotificationsProductionBusiness, NotificationsProductionBusiness>();
        services.AddScoped<INotificationsDispatchBusiness, NotificationsDispatchBusiness>();
        services.AddScoped<IMissedRewardNotificationBusiness, MissedRewardNotificationBusiness>();
        services.AddScoped<INotificationInboxCacheInvalidatorBusiness, NotificationInboxCacheInvalidatorBusiness>();

        services.AddScoped<NotificationsValidator>();

        services.AddScoped<INotificationsMapper, NotificationsMapper>();

        AddPushDelivery(services, configuration);

        return services;
    }

    private static void AddPushDelivery(IServiceCollection services, IConfiguration configuration)
    {
        var accessToken = configuration["ExpoPush:AccessToken"];
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            services.AddScoped<IPushDeliveryService, PushDeliveryPlaceholderService>();
        }
        else
        {
            services.AddHttpClient<IPushDeliveryService, ExpoPushDeliveryService>(client =>
            {
                client.DefaultRequestHeaders.Accept.Add(new("application/json"));
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
                client.Timeout = TimeSpan.FromSeconds(15);
            });
        }

        AddEmailDelivery(services, configuration);
    }

    private static void AddEmailDelivery(IServiceCollection services, IConfiguration configuration)
    {
        var apiKey = configuration["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            services.AddScoped<IEmailDeliveryService, EmailDeliveryPlaceholderService>();
            return;
        }

        var options = new ResendOptions
        {
            ApiKey = apiKey,
            FromAddress = configuration["Resend:FromAddress"] ?? string.Empty,
            BaseUrl = configuration["Resend:BaseUrl"] ?? "https://api.resend.com/"
        };
        services.AddSingleton(options);

        services.AddHttpClient<IEmailDeliveryService, ResendEmailDeliveryService>(client =>
        {
            client.BaseAddress = new Uri(options.BaseUrl);
            client.DefaultRequestHeaders.Accept.Add(new("application/json"));
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            client.Timeout = TimeSpan.FromSeconds(15);
        });
    }
}
