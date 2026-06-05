namespace TrueSpend.Domain.Entities.App;

public sealed class UserPreferenceEntity
{
    public int Id { get; set; }
    public Guid UserId { get; set; }
    public string Theme { get; set; } = "system";
    public string Locale { get; set; } = "en-US";
    public string Timezone { get; set; } = "UTC";
    public bool HideAmounts { get; set; }
    public bool BiometricUnlockEnabled { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
