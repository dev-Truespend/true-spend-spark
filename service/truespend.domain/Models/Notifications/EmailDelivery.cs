namespace TrueSpend.Domain.Models.Notifications;

public sealed record EmailDeliveryRequest(
    string ToEmail,
    string Subject,
    string Body);

public sealed record EmailDeliveryResult(
    bool Success,
    string? ExternalId,
    string? ErrorCode,
    string? ErrorMessage);
