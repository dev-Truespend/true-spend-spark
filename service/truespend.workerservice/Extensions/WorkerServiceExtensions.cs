using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.Business.Analytics;
using TrueSpend.Domain.Business.Billing;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.Business.Devices;
using TrueSpend.Domain.Business.Geo;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.Business.Privacy;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Analytics;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.BusinessInterfaces.Devices;
using TrueSpend.Domain.BusinessInterfaces.Geo;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Privacy;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.Analytics;
using TrueSpend.Domain.ServiceInterfaces.App;
using TrueSpend.Domain.Services.App;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.ServiceInterfaces.Geo;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Services.AIInsights;
using TrueSpend.Domain.Services.Analytics;
using TrueSpend.Domain.Services.Billing;
using TrueSpend.Domain.Services.Catalog;
using TrueSpend.Domain.Services.Devices;
using TrueSpend.Domain.Services.Geo;
using TrueSpend.Domain.Services.Messaging;
using TrueSpend.Domain.Models.Geo;
using TrueSpend.Domain.Services.Notifications;
using TrueSpend.Domain.Services.Persistence;
using TrueSpend.Domain.Services.Plaid;
using TrueSpend.Domain.Services.Privacy;
using TrueSpend.Domain.Services.Recommendations;
using TrueSpend.Domain.Services.Transactions;
using TrueSpend.Domain.Validators;
using TrueSpend.WorkerService.Config;
using TrueSpend.WorkerService.Jobs;
using TrueSpend.WorkerService.Schedulers;

namespace TrueSpend.WorkerService.Extensions;

public static class WorkerServiceExtensions
{
    public static IHostApplicationBuilder AddWorkerService(this IHostApplicationBuilder builder)
    {
        builder.Services.Configure<WorkerConfig>(builder.Configuration.GetSection(WorkerConfig.SectionName));

        var connectionString = builder.Configuration.GetConnectionString("TrueSpendDb") ?? string.Empty;
        builder.Services.AddDbContext<TrueSpendDbContext>(options =>
        {
            if (!string.IsNullOrWhiteSpace(connectionString))
                options.UseNpgsql(connectionString);
        });

        // Required by AIInsightsGenerationBusiness and PlaidUpdateBusiness for entitlement gating.
        builder.Services.AddMemoryCache();
        builder.Services.AddScoped<IBillingReadService, BillingReadService>();
        builder.Services.AddScoped<IBillingReadBusiness, BillingReadBusiness>();
        builder.Services.AddScoped<IEntitlementGuard, EntitlementGuard>();

        var openAiEndpoint = builder.Configuration["AzureOpenAI:Endpoint"] ?? string.Empty;
        var openAiKey = builder.Configuration["AzureOpenAI:ApiKey"] ?? string.Empty;
        var openAiDeployment = builder.Configuration["AzureOpenAI:DeploymentName"] ?? string.Empty;

        if (!string.IsNullOrWhiteSpace(openAiEndpoint) && !string.IsNullOrWhiteSpace(openAiKey) && !string.IsNullOrWhiteSpace(openAiDeployment))
        {
            builder.Services.AddSingleton(new TrueSpend.Domain.Models.AIInsights.AzureOpenAIConfig(openAiEndpoint, openAiKey, openAiDeployment));
            builder.Services.AddHttpClient<IAIOpenAIService, AIOpenAIService>(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }
        else
        {
            builder.Services.AddScoped<IAIOpenAIService, AIOpenAIPlaceholderService>();
        }

        builder.Services.AddScoped<IAIInsightsReadService, AIInsightsReadService>();
        builder.Services.AddScoped<IAIInsightsInsertService, AIInsightsInsertService>();
        builder.Services.AddScoped<IAIInsightsUpdateService, AIInsightsUpdateService>();
        builder.Services.AddScoped<IAIInsightsGenerationBusiness, AIInsightsGenerationBusiness>();
        builder.Services.AddScoped<IAIInsightsCacheInvalidatorBusiness, AIInsightsCacheInvalidatorBusiness>();

        builder.Services.AddScoped<IAnalyticsReadService, AnalyticsReadService>();
        builder.Services.AddScoped<IAnalyticsUpdateService, AnalyticsUpdateService>();
        builder.Services.AddScoped<IAnalyticsComputeBusiness, AnalyticsComputeBusiness>();

        builder.Services.AddScoped<INotificationProductionService, NotificationProductionService>();
        builder.Services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
        builder.Services.AddScoped<INotificationGateService, NotificationGateService>();
        builder.Services.AddScoped<IMessagingInsertService, MessagingInsertService>();
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddScoped<IDistributedLockService, DistributedLockService>();
        builder.Services.AddScoped<INotificationsProductionBusiness, NotificationsProductionBusiness>();
        builder.Services.AddScoped<INotificationsDispatchBusiness, NotificationsDispatchBusiness>();
        builder.Services.AddScoped<INotificationInboxCacheInvalidatorBusiness, NotificationInboxCacheInvalidatorBusiness>();
        builder.Services.AddScoped<IWeeklySummaryNotificationBusiness, WeeklySummaryNotificationBusiness>();
        builder.Services.AddScoped<ISubscriptionExpiryNotificationBusiness, SubscriptionExpiryNotificationBusiness>();
        builder.Services.AddScoped<IUnusualTransactionNotificationBusiness, UnusualTransactionNotificationBusiness>();
        builder.Services.AddScoped<IMissedRewardNotificationBusiness, MissedRewardNotificationBusiness>();

        AddPushDelivery(builder);
        AddEmailDelivery(builder);

        builder.Services.AddScoped<IPlaidProvider, PlaidPlaceholderProvider>();
        builder.Services.AddScoped<IPlaidReadService, PlaidReadService>();
        builder.Services.AddScoped<IPlaidUpdateService, PlaidUpdateService>();
        builder.Services.AddScoped<IPlaidInstitutionsCatalogService, PlaidInstitutionsCatalogService>();
        builder.Services.AddScoped<ITransactionsInsertService, TransactionsInsertService>();
        builder.Services.AddScoped<ITransactionsUpdateService, TransactionsUpdateService>();
        builder.Services.AddScoped<IRewardRulesReadService, RewardRulesReadService>();
        builder.Services.AddScoped<PlaidValidator>();
        builder.Services.AddScoped<IUserDailyUsageService, UserDailyUsageService>();
        builder.Services.Configure<TrueSpend.Domain.Models.Billing.ManualResyncOptions>(builder.Configuration.GetSection("ManualResync"));
        builder.Services.AddScoped<IManualResyncQuotaBusiness, ManualResyncQuotaBusiness>();
        builder.Services.AddScoped<IPlaidUpdateBusiness, PlaidUpdateBusiness>();
        builder.Services.AddScoped<IPlaidCardCatalogMatchBusiness, PlaidCardCatalogMatchBusiness>();
        builder.Services.AddScoped<ICatalogReadService, CatalogReadService>();
        builder.Services.AddScoped<IPlaidInstitutionsCatalogBusiness, PlaidInstitutionsCatalogBusiness>();

        builder.Services.AddScoped<IDevicesUpdateService, DevicesUpdateService>();
        builder.Services.AddScoped<IDevicesUpdateBusiness, DevicesUpdateBusiness>();

        var rewardsCcBaseUrl = builder.Configuration["RewardsCc:BaseUrl"] ?? string.Empty;
        var rewardsCcApiKey = builder.Configuration["RewardsCc:ApiKey"] ?? string.Empty;
        var rewardsCcHost = builder.Configuration["RewardsCc:Host"] ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(rewardsCcBaseUrl) && !string.IsNullOrWhiteSpace(rewardsCcApiKey) && !string.IsNullOrWhiteSpace(rewardsCcHost))
        {
            builder.Services.Configure<RewardsCcProviderOptions>(builder.Configuration.GetSection("RewardsCc"));
            builder.Services.AddHttpClient<IRewardsCcProvider, RewardsCcProvider>(client =>
            {
                client.BaseAddress = new Uri(rewardsCcBaseUrl);
                client.DefaultRequestHeaders.Add("X-RapidAPI-Key", rewardsCcApiKey);
                client.DefaultRequestHeaders.Add("X-RapidAPI-Host", rewardsCcHost);
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }
        else
        {
            builder.Services.AddScoped<IRewardsCcProvider, RewardsCcPlaceholderProvider>();
        }
        builder.Services.Configure<RewardsCcSeedOptions>(builder.Configuration.GetSection("RewardsCc"));
        builder.Services.AddScoped<ICatalogSyncService, CatalogSyncService>();
        builder.Services.AddScoped<IRewardsCcCatalogSyncBusiness, RewardsCcCatalogSyncBusiness>();
        builder.Services.AddScoped<IRewardsCcCatalogReconcileBusiness, RewardsCcCatalogReconcileBusiness>();

        builder.Services.AddScoped<IAdminNotificationCampaignService, AdminNotificationCampaignService>();
        builder.Services.AddScoped<IAdminNotificationDispatchBusiness, AdminNotificationDispatchBusiness>();

        builder.Services.AddScoped<ICardCatalogReviewService, CardCatalogReviewService>();
        builder.Services.AddScoped<ICardCatalogMappingReviewBusiness, CardCatalogMappingReviewBusiness>();

        var supabaseUrl = builder.Configuration["Supabase:Url"] ?? string.Empty;
        var supabaseServiceRoleKey = builder.Configuration["Supabase:ServiceRoleKey"] ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(supabaseUrl) && !string.IsNullOrWhiteSpace(supabaseServiceRoleKey))
        {
            builder.Services.Configure<SupabaseAdminProviderOptions>(builder.Configuration.GetSection("Supabase"));
            builder.Services.AddHttpClient<ISupabaseAdminProvider, SupabaseAdminProvider>(client =>
            {
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }
        else
        {
            builder.Services.AddScoped<ISupabaseAdminProvider, SupabaseAdminPlaceholderProvider>();
        }
        builder.Services.AddScoped<IAccountDeletionService, AccountDeletionService>();
        builder.Services.AddScoped<IAccountDeletionPurgeBusiness, AccountDeletionPurgeBusiness>();

        AddFoursquarePlaces(builder);

        builder.Services.AddScoped<ReminderFiringJob>();
        builder.Services.AddScoped<AIInsightGenerationJob>();
        builder.Services.AddScoped<PlaidTransactionSyncJob>();
        builder.Services.AddScoped<WeeklySummaryJob>();
        builder.Services.AddScoped<SubscriptionExpiryNotificationJob>();
        builder.Services.AddScoped<UnusualTransactionJob>();
        builder.Services.AddScoped<InvalidDeviceTokenCleanupJob>();
        builder.Services.AddScoped<PlaidInstitutionCatalogJob>();
        builder.Services.AddScoped<RewardsCcCatalogReconcileJob>();
        builder.Services.AddScoped<RewardsCcCatalogSyncOrchestrationJob>();
        builder.Services.AddScoped<AdminNotificationDispatchJob>();
        builder.Services.AddScoped<CardCatalogMappingReviewJob>();
        builder.Services.AddScoped<AccountDeletionPurgeJob>();
        builder.Services.AddScoped<FoursquarePlacesCatalogSyncJob>();

        builder.Services.AddHostedService<ReminderScheduler>();
        builder.Services.AddHostedService<AIInsightGenerationScheduler>();
        builder.Services.AddHostedService<PlaidTransactionSyncScheduler>();
        builder.Services.AddHostedService<WeeklySummaryScheduler>();
        builder.Services.AddHostedService<SubscriptionExpiryNotificationScheduler>();
        builder.Services.AddHostedService<UnusualTransactionScheduler>();
        builder.Services.AddHostedService<InvalidDeviceTokenCleanupScheduler>();
        builder.Services.AddHostedService<PlaidInstitutionCatalogScheduler>();
        builder.Services.AddHostedService<RewardsCcCatalogSyncScheduler>();
        builder.Services.AddHostedService<RewardsCcCatalogReconcileScheduler>();
        builder.Services.AddHostedService<RewardsCcCatalogSyncStartupRunner>();
        builder.Services.AddHostedService<AdminNotificationDispatchScheduler>();
        builder.Services.AddHostedService<AccountDeletionPurgeScheduler>();
        builder.Services.AddHostedService<FoursquarePlacesCatalogSyncScheduler>();

        return builder;
    }

    private static void AddFoursquarePlaces(IHostApplicationBuilder builder)
    {
        builder.Services.Configure<FoursquarePlacesCatalogOptions>(
            builder.Configuration.GetSection(FoursquarePlacesCatalogOptions.SectionName));

        builder.Services.AddScoped<IFoursquareCatalogReadService, FoursquareCatalogReadService>();
        builder.Services.AddScoped<IFoursquarePlacesWriteService, FoursquarePlacesWriteService>();
        builder.Services.AddScoped<IFoursquarePlacesCatalogSyncBusiness, FoursquarePlacesCatalogSyncBusiness>();

        var placesApiKey = builder.Configuration["Foursquare:PlacesApiKey"] ?? string.Empty;
        var placesBaseUrl = builder.Configuration["Foursquare:BaseUrl"] ?? "https://api.foursquare.com";
        if (!string.IsNullOrWhiteSpace(placesApiKey))
        {
            builder.Services.AddHttpClient<IFoursquarePlacesProvider, FoursquarePlacesProvider>(client =>
            {
                client.BaseAddress = new Uri(placesBaseUrl);
                client.DefaultRequestHeaders.Accept.Add(new("application/json"));
                client.DefaultRequestHeaders.Add("Authorization", placesApiKey);
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }
        else
        {
            builder.Services.AddScoped<IFoursquarePlacesProvider, FoursquarePlacesPlaceholderProvider>();
        }
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
