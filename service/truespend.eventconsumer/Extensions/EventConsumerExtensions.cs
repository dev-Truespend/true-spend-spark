using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.Business.Analytics;
using TrueSpend.Domain.Business.Billing;
using TrueSpend.Domain.Business.Cards;
using TrueSpend.Domain.Business.Messaging;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Cards;
using TrueSpend.Domain.BusinessInterfaces.Messaging;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Analytics;
using TrueSpend.Domain.Services.Messaging;
using TrueSpend.Domain.Services.Notifications;
using TrueSpend.Domain.Services.Persistence;
using TrueSpend.EventConsumer.Config;
using TrueSpend.EventConsumer.Consumers;
using TrueSpend.EventConsumer.Dispatchers;
using TrueSpend.EventConsumer.Handlers;

namespace TrueSpend.EventConsumer.Extensions;

public static class EventConsumerExtensions
{
    public static IHostApplicationBuilder AddEventConsumer(this IHostApplicationBuilder builder)
    {
        builder.Services.AddMemoryCache();
        builder.Services.Configure<ServiceBusConfig>(builder.Configuration.GetSection(ServiceBusConfig.SectionName));

        var connectionString = builder.Configuration.GetConnectionString("TrueSpendDb") ?? string.Empty;
        builder.Services.AddDbContext<TrueSpendDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
                options.UseNpgsql(connectionString);
        });

        builder.Services.AddScoped<UserCardCreatedHandler>();
        builder.Services.AddScoped<CardProductRequestCreatedHandler>();
        builder.Services.AddScoped<MerchantVisitCreatedHandler>();
        builder.Services.AddScoped<SubscriptionUpdatedHandler>();
        builder.Services.AddScoped<PaymentMethodUpdatedHandler>();
        builder.Services.AddScoped<IEntitlementCacheInvalidatorBusiness, EntitlementCacheInvalidatorBusiness>();
        builder.Services.AddScoped<IBillingPaymentMethodCacheInvalidatorBusiness, BillingPaymentMethodCacheInvalidatorBusiness>();
        builder.Services.AddScoped<MissedRewardEventCreatedHandler>();
        builder.Services.AddScoped<AnalyticsRecomputeHandler>();
        builder.Services.AddScoped<RewardOverrideUpsertedHandler>();
        builder.Services.AddScoped<RewardOverrideDeletedHandler>();
        builder.Services.AddScoped<PlaidConnectionDisconnectedHandler>();
        builder.Services.AddScoped<NotificationCreatedHandler>();
        builder.Services.AddScoped<InboxCacheInvalidatorHandler>();
        builder.Services.AddScoped<NotificationReadHandler>();
        builder.Services.AddScoped<NotificationsReadAllHandler>();
        builder.Services.AddScoped<AIGenerationCompletedHandler>();
        builder.Services.AddScoped<PlaidReauthNotificationHandler>();
        builder.Services.AddScoped<PlaidCardsCacheInvalidatorHandler>();
        builder.Services.AddScoped<PlaidNewAccountsNotificationHandler>();

        builder.Services.AddScoped<IAnalyticsReadService, AnalyticsReadService>();
        builder.Services.AddScoped<IAnalyticsUpdateService, AnalyticsUpdateService>();
        builder.Services.AddScoped<IAnalyticsComputeBusiness, AnalyticsComputeBusiness>();

        builder.Services.AddScoped<INotificationProductionService, NotificationProductionService>();
        builder.Services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
        builder.Services.AddScoped<INotificationGateService, NotificationGateService>();
        builder.Services.AddScoped<IMessagingInsertService, MessagingInsertService>();
        builder.Services.AddScoped<IOutboxDispatchService, OutboxDispatchService>();
        builder.Services.AddScoped<IOutboxDispatchBusiness, OutboxDispatchBusiness>();
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddScoped<INotificationsDispatchBusiness, NotificationsDispatchBusiness>();
        builder.Services.AddScoped<IMissedRewardNotificationBusiness, MissedRewardNotificationBusiness>();
        builder.Services.AddScoped<IPlaidReauthNotificationBusiness, PlaidReauthNotificationBusiness>();
        builder.Services.AddScoped<IPlaidNewAccountsNotificationBusiness, PlaidNewAccountsNotificationBusiness>();
        builder.Services.AddScoped<ICardsCacheInvalidatorBusiness, CardsCacheInvalidatorBusiness>();
        builder.Services.AddScoped<INotificationInboxCacheInvalidatorBusiness, NotificationInboxCacheInvalidatorBusiness>();
        builder.Services.AddScoped<IAIInsightsCacheInvalidatorBusiness, AIInsightsCacheInvalidatorBusiness>();

        AddPushDelivery(builder);
        AddEmailDelivery(builder);

        builder.Services.AddSingleton<IEventDispatcher, EventDispatcher>();

        #region archive — async outbox polling consumer (disabled in MVP)
        // The OutboxPollingConsumer hosted service ran inside truespend.eventconsumer and polled
        // the messaging.event_outbox table, dispatching every row through the handler chain. In
        // the MVP, side-effects run inline post-commit inside the producing business classes
        // (see _docs/Refactors/sync-execution-conversion.md), so the polling consumer is not
        // registered as a hosted service. The dispatcher, handler, mapper, and config wiring
        // above remain live so re-enabling is a single line change.
        //
        // builder.Services.AddHostedService<OutboxPollingConsumer>();
        #endregion

        return builder;
    }

    private static void AddPushDelivery(IHostApplicationBuilder builder)
    {
        var accessToken = builder.Configuration["ExpoPush:AccessToken"];
        if (string.IsNullOrWhiteSpace(accessToken))
        {
            builder.Services.AddScoped<IPushDeliveryService, PushDeliveryPlaceholderService>();
            return;
        }

        builder.Services.AddHttpClient<IPushDeliveryService, ExpoPushDeliveryService>(client =>
        {
            client.DefaultRequestHeaders.Accept.Add(new("application/json"));
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {accessToken}");
            client.Timeout = TimeSpan.FromSeconds(15);
        });
    }

    private static void AddEmailDelivery(IHostApplicationBuilder builder)
    {
        var apiKey = builder.Configuration["Resend:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            builder.Services.AddScoped<IEmailDeliveryService, EmailDeliveryPlaceholderService>();
            return;
        }

        var options = new ResendOptions
        {
            ApiKey = apiKey,
            FromAddress = builder.Configuration["Resend:FromAddress"] ?? string.Empty,
            BaseUrl = builder.Configuration["Resend:BaseUrl"] ?? "https://api.resend.com/"
        };
        builder.Services.AddSingleton(options);

        builder.Services.AddHttpClient<IEmailDeliveryService, ResendEmailDeliveryService>(client =>
        {
            client.BaseAddress = new Uri(options.BaseUrl);
            client.DefaultRequestHeaders.Accept.Add(new("application/json"));
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            client.Timeout = TimeSpan.FromSeconds(15);
        });
    }
}
