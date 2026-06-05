using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public interface IPlaidWebhookKeyProvider
{
    Task<PlaidWebhookVerificationKey?> GetKeyAsync(string keyId, CancellationToken cancellationToken);
}
