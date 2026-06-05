namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidWebhookInput(
    string PlaidEventId,
    string WebhookType,
    string WebhookCode,
    string? PlaidItemExternalId,
    string? Error,
    string RawPayload);
