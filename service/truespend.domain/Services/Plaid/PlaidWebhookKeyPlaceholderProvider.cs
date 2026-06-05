using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Domain.Services.Plaid;

// Used when Plaid client credentials are not configured (local dev). Returns no key so the
// PlaidSignatureFilter fails closed — Plaid webhooks cannot be processed without real keys.
// Local dev usually exercises webhooks via the placeholder Plaid provider directly, not via
// real Plaid-to-server traffic.
public sealed class PlaidWebhookKeyPlaceholderProvider : IPlaidWebhookKeyProvider
{
    public Task<PlaidWebhookVerificationKey?> GetKeyAsync(string keyId, CancellationToken cancellationToken) =>
        Task.FromResult<PlaidWebhookVerificationKey?>(null);
}
