using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Business.AIInsights;
using TrueSpend.Domain.Business.Catalog;
using TrueSpend.Domain.Business.Devices;
using TrueSpend.Domain.Business.Notifications;
using TrueSpend.Domain.Business.Plaid;
using TrueSpend.Domain.Business.Privacy;
using TrueSpend.Domain.BusinessInterfaces.AIInsights;
using TrueSpend.Domain.BusinessInterfaces.Catalog;
using TrueSpend.Domain.BusinessInterfaces.Devices;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.BusinessInterfaces.Privacy;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.Services.AIInsights;
using TrueSpend.Domain.Services.Catalog;
using TrueSpend.Domain.Services.Devices;
using TrueSpend.Domain.Services.Messaging;
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

        builder.Services.AddScoped<INotificationProductionService, NotificationProductionService>();
        builder.Services.AddScoped<INotificationDispatchService, NotificationDispatchService>();
        builder.Services.AddScoped<INotificationGateService, NotificationGateService>();
        builder.Services.AddScoped<IMessagingInsertService, MessagingInsertService>();
        builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
        builder.Services.AddScoped<IDistributedLockService, DistributedLockService>();
        builder.Services.AddScoped<INotificationsProductionBusiness, NotificationsProductionBusiness>();
        builder.Services.AddScoped<IWeeklySummaryNotificationBusiness, WeeklySummaryNotificationBusiness>();
        builder.Services.AddScoped<IUnusualTransactionNotificationBusiness, UnusualTransactionNotificationBusiness>();

        builder.Services.AddScoped<IPlaidProvider, PlaidPlaceholderProvider>();
        builder.Services.AddScoped<IPlaidReadService, PlaidReadService>();
        builder.Services.AddScoped<IPlaidUpdateService, PlaidUpdateService>();
        builder.Services.AddScoped<IPlaidInstitutionsCatalogService, PlaidInstitutionsCatalogService>();
        builder.Services.AddScoped<ITransactionsInsertService, TransactionsInsertService>();
        builder.Services.AddScoped<ITransactionsUpdateService, TransactionsUpdateService>();
        builder.Services.AddScoped<IRewardRulesReadService, RewardRulesReadService>();
        builder.Services.AddScoped<PlaidValidator>();
        builder.Services.AddScoped<IPlaidUpdateBusiness, PlaidUpdateBusiness>();
        builder.Services.AddScoped<IPlaidInstitutionsCatalogBusiness, PlaidInstitutionsCatalogBusiness>();

        builder.Services.AddScoped<IDevicesUpdateService, DevicesUpdateService>();
        builder.Services.AddScoped<IDevicesUpdateBusiness, DevicesUpdateBusiness>();

        var rewardsCcBaseUrl = builder.Configuration["RewardsCc:BaseUrl"] ?? string.Empty;
        var rewardsCcApiKey = builder.Configuration["RewardsCc:ApiKey"] ?? string.Empty;
        if (!string.IsNullOrWhiteSpace(rewardsCcBaseUrl) && !string.IsNullOrWhiteSpace(rewardsCcApiKey))
        {
            builder.Services.Configure<RewardsCcProviderOptions>(builder.Configuration.GetSection("RewardsCc"));
            builder.Services.AddHttpClient<IRewardsCcProvider, RewardsCcProvider>(client =>
            {
                client.BaseAddress = new Uri(rewardsCcBaseUrl);
                client.DefaultRequestHeaders.Add("X-Api-Key", rewardsCcApiKey);
                client.Timeout = TimeSpan.FromSeconds(30);
            });
        }
        else
        {
            builder.Services.AddScoped<IRewardsCcProvider, RewardsCcPlaceholderProvider>();
        }
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

        builder.Services.AddScoped<ReminderFiringJob>();
        builder.Services.AddScoped<AIInsightGenerationJob>();
        builder.Services.AddScoped<PlaidTransactionSyncJob>();
        builder.Services.AddScoped<WeeklySummaryJob>();
        builder.Services.AddScoped<UnusualTransactionJob>();
        builder.Services.AddScoped<InvalidDeviceTokenCleanupJob>();
        builder.Services.AddScoped<PlaidInstitutionCatalogJob>();
        builder.Services.AddScoped<RewardsCcIssuerSyncJob>();
        builder.Services.AddScoped<RewardsCcCardProductSyncJob>();
        builder.Services.AddScoped<RewardsCcRewardRuleSyncJob>();
        builder.Services.AddScoped<RewardsCcCatalogReconcileJob>();
        builder.Services.AddScoped<RewardsCcCatalogSyncOrchestrationJob>();
        builder.Services.AddScoped<AdminNotificationDispatchJob>();
        builder.Services.AddScoped<CardCatalogMappingReviewJob>();
        builder.Services.AddScoped<AccountDeletionPurgeJob>();

        builder.Services.AddHostedService<ReminderScheduler>();
        builder.Services.AddHostedService<AIInsightGenerationScheduler>();
        builder.Services.AddHostedService<PlaidTransactionSyncScheduler>();
        builder.Services.AddHostedService<WeeklySummaryScheduler>();
        builder.Services.AddHostedService<UnusualTransactionScheduler>();
        builder.Services.AddHostedService<InvalidDeviceTokenCleanupScheduler>();
        builder.Services.AddHostedService<PlaidInstitutionCatalogScheduler>();
        builder.Services.AddHostedService<RewardsCcCatalogSyncScheduler>();
        builder.Services.AddHostedService<RewardsCcCatalogReconcileScheduler>();
        builder.Services.AddHostedService<AdminNotificationDispatchScheduler>();
        builder.Services.AddHostedService<AccountDeletionPurgeScheduler>();

        return builder;
    }
}
