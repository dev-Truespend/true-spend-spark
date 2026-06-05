namespace TrueSpend.Domain.Models.Messaging;

public sealed record OutboxSubscriptionRef(int SubscriptionId, string ConsumerName);
