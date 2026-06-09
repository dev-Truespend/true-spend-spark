namespace TrueSpend.Domain.Models.Privacy;

public sealed record AccountPurgeCandidate(int RequestId, Guid UserId);

public sealed record AccountDeletionPurgeResult(
    int PurgesProcessed,
    int PurgesSkippedCancelled,
    int Failed)
{
    public static AccountDeletionPurgeResult Empty => new(0, 0, 0);
}

// User-facing deletion status. State is "none" (no scheduled deletion) or "pending"
// (deletion scheduled, in the grace window until PurgeAfter).
public sealed record AccountDeletionStatus(string State, DateTimeOffset? RequestedAt, DateTimeOffset? PurgeAfter)
{
    public const string StateNone = "none";
    public const string StatePending = "pending";

    public static AccountDeletionStatus None => new(StateNone, null, null);
}

public static class AccountDeletionStatusCodes
{
    public const string Pending = "pending";
    public const string Cancelled = "cancelled";
    public const string Completed = "completed";
    public const string Failed = "failed";
}

public static class PrivacyAuditEventTypes
{
    public const string AccountDeletionRequested = "account_deletion.requested";
    public const string AccountDeletionCancelled = "account_deletion.cancelled";
    public const string AccountDeletionCompleted = "account_deletion.completed";
    public const string AccountDeletionFailed = "account_deletion.failed";
}
