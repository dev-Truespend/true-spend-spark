namespace TrueSpend.Domain.Models.Billing;

// Bound from the "ManualResync" config section.
public sealed class ManualResyncOptions
{
    // Max user-initiated Plaid re-syncs per day for Pro users.
    public int ProResyncDailyLimit { get; set; } = 5;
}

public sealed record ManualResyncQuotaStatus(bool IsPro, int Limit, int Used, int Remaining);

public sealed record ManualResyncConsumeResult(bool Allowed, ManualResyncQuotaStatus Status);
