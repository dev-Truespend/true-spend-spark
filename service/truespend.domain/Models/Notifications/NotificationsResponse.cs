namespace TrueSpend.Domain.Models.Notifications;

public sealed record NotificationsResponse(IReadOnlyList<Notification> Notifications);
