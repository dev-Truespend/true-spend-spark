using Microsoft.Extensions.Options;
using Stripe;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using CheckoutSessionCreateOptions = Stripe.Checkout.SessionCreateOptions;
using CheckoutSessionLineItemOptions = Stripe.Checkout.SessionLineItemOptions;
using CheckoutSessionService = Stripe.Checkout.SessionService;
using CheckoutSessionSubscriptionDataOptions = Stripe.Checkout.SessionSubscriptionDataOptions;
using PortalSessionCreateOptions = Stripe.BillingPortal.SessionCreateOptions;
using PortalSessionService = Stripe.BillingPortal.SessionService;

namespace TrueSpend.Domain.Services.Billing;

public sealed class StripeProviderOptions
{
    public string SecretKey { get; set; } = string.Empty;
    public string PublishableKey { get; set; } = string.Empty;
    public string WebhookSecret { get; set; } = string.Empty;
    public string OnboardingSuccessUrl { get; set; } = "truespend://app/home?checkout=success";
    public string OnboardingCancelUrl { get; set; } = "truespend://app/onboarding/plans";
    public string BillingSuccessUrl { get; set; } = "truespend://app/billing?checkout=success";
    public string BillingCancelUrl { get; set; } = "truespend://app/billing";
    public string PortalReturnUrl { get; set; } = "truespend://app/billing";
}

public sealed class StripeProvider(IOptions<StripeProviderOptions> optionsAccessor) : IStripeProvider
{
    private const string ProviderName = "stripe";

    private readonly StripeProviderOptions _options = optionsAccessor.Value;

    public async Task<HostedBillingResponse> CreateCheckoutSessionAsync(CheckoutSessionInput input, CancellationToken cancellationToken)
    {
        try
        {
            var options = new CheckoutSessionCreateOptions
            {
                Mode = "subscription",
                ClientReferenceId = input.UserId.ToString("N"),
                LineItems =
                [
                    new CheckoutSessionLineItemOptions { Price = input.StripePriceId, Quantity = 1 }
                ],
                SuccessUrl = input.SuccessUrl,
                CancelUrl = input.CancelUrl,
                SubscriptionData = input.TrialDays > 0
                    ? new CheckoutSessionSubscriptionDataOptions { TrialPeriodDays = input.TrialDays }
                    : null
            };

            if (!string.IsNullOrWhiteSpace(input.ExistingStripeCustomerId))
            {
                options.Customer = input.ExistingStripeCustomerId;
            }
            else if (!string.IsNullOrWhiteSpace(input.Email))
            {
                options.CustomerEmail = input.Email;
            }

            var service = new CheckoutSessionService(NewClient());
            var session = await service.CreateAsync(options, cancellationToken: cancellationToken);
            return new HostedBillingResponse(session.Url);
        }
        catch (StripeException ex)
        {
            throw new ExternalProviderAppException(ProviderName, $"Stripe checkout create failed: {ex.Message}");
        }
    }

    public async Task<HostedBillingResponse> CreatePortalSessionAsync(PortalSessionInput input, CancellationToken cancellationToken)
    {
        try
        {
            var options = new PortalSessionCreateOptions
            {
                Customer = input.StripeCustomerId,
                ReturnUrl = input.ReturnUrl
            };
            var service = new PortalSessionService(NewClient());
            var session = await service.CreateAsync(options, cancellationToken: cancellationToken);
            return new HostedBillingResponse(session.Url);
        }
        catch (StripeException ex)
        {
            throw new ExternalProviderAppException(ProviderName, $"Stripe portal create failed: {ex.Message}");
        }
    }

    public StripeEventEnvelope? ParseWebhookEvent(string rawPayload) =>
        StripeEventMapper.FromRawJson(rawPayload);

    private IStripeClient NewClient() => new StripeClient(_options.SecretKey);
}
