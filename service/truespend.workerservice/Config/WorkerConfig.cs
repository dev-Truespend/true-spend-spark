namespace TrueSpend.WorkerService.Config;

public sealed class WorkerConfig
{
    public const string SectionName = "WorkerConfig";

    public JobConfig ReminderFiring { get; init; } = new();
    public JobConfig AIInsightGeneration { get; init; } = new();
    public JobConfig PlaidTransactionSync { get; init; } = new();
    public JobConfig WeeklySummary { get; init; } = new();
    public JobConfig SubscriptionExpiry { get; init; } = new();
    public JobConfig UnusualTransaction { get; init; } = new();
    public JobConfig InvalidDeviceTokenCleanup { get; init; } = new();
    public JobConfig PlaidInstitutionCatalog { get; init; } = new();
    public JobConfig RewardsCcCatalogSync { get; init; } = new();
    public JobConfig RewardsCcCatalogReconcile { get; init; } = new();
    public JobConfig AdminNotificationDispatch { get; init; } = new();
    public JobConfig AccountDeletionPurge { get; init; } = new();
    public JobConfig FoursquarePlacesCatalogSync { get; init; } = new();
}

public sealed class JobConfig
{
    public bool Enabled { get; init; } = true;
    public string Cron { get; init; } = "* * * * *";
    public bool DryRun { get; init; }
    public int MaxRetries { get; init; } = 3;
    public int BatchSize { get; init; } = 100;
    public int InitialBackoffSeconds { get; init; } = 60;
    public int MaxBackoffSeconds { get; init; } = 600;

    // Job-specific knobs (only the consumer of each cares).
    public int LookbackMinutes { get; init; } = 15;
    public int LookbackHours { get; init; } = 48;
    public int FireDay { get; init; } = 0;            // 0 = Sunday
    public int FireHour { get; init; } = 9;
    public int WindowDays { get; init; } = 2;         // subscription-expiry reminder lookahead
    public decimal ThresholdAmount { get; init; } = 500m;
    public int PerItemTimeoutSeconds { get; init; } = 60;
    public int MaxConcurrency { get; init; } = 1;
}
