namespace TrueSpend.Domain.Models.Messaging;

public sealed record PendingOutboxEvent(
    int Id,
    string EventType,
    string Payload);
