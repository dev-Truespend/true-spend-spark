using Microsoft.Extensions.DependencyInjection;

namespace TrueSpend.WorkerService.Jobs;

/// <summary>
/// Maps a manual-trigger job name to the delegate that resolves and runs it.
/// Keys match the <c>WorkerConfig</c> section names so the same identifier both triggers and configures a job.
/// Used only by the manual-trigger endpoints; the cron schedulers run jobs independently.
/// </summary>
public static class JobRegistry
{
    public static readonly IReadOnlyDictionary<string, Func<IServiceProvider, CancellationToken, Task>> Runners =
        new Dictionary<string, Func<IServiceProvider, CancellationToken, Task>>(StringComparer.OrdinalIgnoreCase)
        {
            ["ReminderFiring"] = (sp, ct) => sp.GetRequiredService<ReminderFiringJob>().RunAsync(ct),
            ["AIInsightGeneration"] = (sp, ct) => sp.GetRequiredService<AIInsightGenerationJob>().RunAsync(ct),
            ["PlaidTransactionSync"] = (sp, ct) => sp.GetRequiredService<PlaidTransactionSyncJob>().RunAsync(ct),
            ["WeeklySummary"] = (sp, ct) => sp.GetRequiredService<WeeklySummaryJob>().RunAsync(ct),
            ["SubscriptionExpiry"] = (sp, ct) => sp.GetRequiredService<SubscriptionExpiryNotificationJob>().RunAsync(ct),
            ["UnusualTransaction"] = (sp, ct) => sp.GetRequiredService<UnusualTransactionJob>().RunAsync(ct),
            ["InvalidDeviceTokenCleanup"] = (sp, ct) => sp.GetRequiredService<InvalidDeviceTokenCleanupJob>().RunAsync(ct),
            ["PlaidInstitutionCatalog"] = (sp, ct) => sp.GetRequiredService<PlaidInstitutionCatalogJob>().RunAsync(ct),
            ["RewardsCcCatalogSync"] = (sp, ct) => sp.GetRequiredService<RewardsCcCatalogSyncOrchestrationJob>().RunAsync(ct),
            ["RewardsCcCatalogReconcile"] = (sp, ct) => sp.GetRequiredService<RewardsCcCatalogReconcileJob>().RunAsync(ct),
            ["AdminNotificationDispatch"] = (sp, ct) => sp.GetRequiredService<AdminNotificationDispatchJob>().RunAsync(ct),
            ["CardCatalogMappingReview"] = (sp, ct) => sp.GetRequiredService<CardCatalogMappingReviewJob>().RunAsync(ct),
            ["AccountDeletionPurge"] = (sp, ct) => sp.GetRequiredService<AccountDeletionPurgeJob>().RunAsync(ct),
            ["FoursquarePlacesCatalog"] = (sp, ct) => sp.GetRequiredService<FoursquarePlacesCatalogSyncJob>().RunAsync(ct),
            ["PersonalPlaceDetection"] = (sp, ct) => sp.GetRequiredService<PersonalPlaceDetectionJob>().RunAsync(ct),
        };
}
