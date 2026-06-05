namespace TrueSpend.Domain.Models.Notifications;

public sealed record UpdateNotificationTypePreferenceRequest(string TypeCode, bool Enabled);
