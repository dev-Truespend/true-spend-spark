using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.ServiceInterfaces.Billing;

namespace TrueSpend.Domain.Services.Billing;

public sealed class StripePlaceholderProvider : IStripeProvider
{
    public Task<HostedBillingResponse> CreateCheckoutSessionAsync(CheckoutSessionInput input, CancellationToken cancellationToken)
    {
        var sessionId = $"cs_placeholder_{Guid.NewGuid():N}";
        var url = $"https://checkout.stripe.com/c/pay/{sessionId}?context={input.ReturnContextCode}";
        return Task.FromResult(new HostedBillingResponse(url));
    }

    public Task<HostedBillingResponse> CreatePortalSessionAsync(PortalSessionInput input, CancellationToken cancellationToken)
    {
        var sessionId = $"ps_placeholder_{Guid.NewGuid():N}";
        var url = $"https://billing.stripe.com/p/session/{sessionId}";
        return Task.FromResult(new HostedBillingResponse(url));
    }

    public StripeEventEnvelope? ParseWebhookEvent(string rawPayload) => StripeEventMapper.FromRawJson(rawPayload);
}
