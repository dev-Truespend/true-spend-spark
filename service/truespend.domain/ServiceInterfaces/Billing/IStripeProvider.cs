using TrueSpend.Domain.Models.Billing;

namespace TrueSpend.Domain.ServiceInterfaces.Billing;

public interface IStripeProvider
{
    Task<HostedBillingResponse> CreateCheckoutSessionAsync(CheckoutSessionInput input, CancellationToken cancellationToken);
    Task<HostedBillingResponse> CreatePortalSessionAsync(PortalSessionInput input, CancellationToken cancellationToken);
    StripeEventEnvelope? ParseWebhookEvent(string rawPayload);
}
