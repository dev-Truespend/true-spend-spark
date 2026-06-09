namespace TrueSpend.Domain.Models.Privacy;

// Bound from the "Privacy" config section.
public sealed class PrivacyOptions
{
    // Grace window (days) between an account-deletion request and the purge job hard-deleting the account.
    public int DeletionGraceDays { get; set; } = 14;
}
