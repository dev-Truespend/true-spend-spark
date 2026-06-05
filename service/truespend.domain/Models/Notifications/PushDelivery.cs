namespace TrueSpend.Domain.Models.Notifications;

public sealed record PushDeliveryRequest(
    string PushToken,
    string Title,
    string Body,
    string? Payload);

public sealed record PushDeliveryResult(
    bool Success,
    string? ExternalId,
    string? ErrorCode,
    string? ErrorMessage);

public sealed record PushTarget(
    int DeviceId,
    string PushToken);

public sealed record NotificationDispatchInput(
    int NotificationId,
    Guid UserId,
    string Title,
    string Body,
    string? Payload,
    bool HonorsQuietHours);
