namespace TrueSpend.Domain.Models.Billing;

public sealed record StripeWebhookInput(string StripeEventId, string EventType, string RawPayload);

public sealed record StripeWebhookResult(bool Persisted, bool AlreadyProcessed);
