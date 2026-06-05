namespace TrueSpend.Domain.Models.NotificationSettings;

public sealed record NotificationType(string Code, string DisplayName, bool Enabled);
