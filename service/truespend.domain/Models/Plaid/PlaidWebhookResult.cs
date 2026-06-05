namespace TrueSpend.Domain.Models.Plaid;

public sealed record PlaidWebhookResult(
    bool Received,
    bool Deduplicated,
    int? PlaidItemId,
    string? NewStatusCode);
