using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Billing;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Services.Billing;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Billing;

public sealed class BillingInsertBusiness(
    IStripeProvider stripeProvider,
    IBillingReadService billingReadService,
    IBillingInsertService billingInsertService,
    IOnboardingReadService onboardingReadService,
    IOnboardingUpdateService onboardingUpdateService,
    IUnitOfWork unitOfWork,
    IOptions<StripeProviderOptions> stripeOptions,
    BillingValidator validator) : IBillingInsertBusiness
{
    private const string FallbackCountryCode = "US";
    private readonly StripeProviderOptions _stripeOptions = stripeOptions.Value;

    public async Task<BusinessResponse<HostedBillingResponse>> CreateCheckoutAsync(
        OnboardingWorkflowUser user,
        CreateCheckoutSessionRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateCreateCheckout(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<HostedBillingResponse>.Fail(errors, 400);
        }

        var countryCode = await billingReadService.GetProfileCountryCodeAsync(user.UserId, cancellationToken)
            ?? FallbackCountryCode;
        var planPrice = await billingReadService.LookupPlanPriceAsync(request.PlanCode, request.PeriodCode, countryCode, cancellationToken);
        if (planPrice is null)
        {
            return BusinessResponse<HostedBillingResponse>.Fail([$"No active price found for plan {request.PlanCode} ({request.PeriodCode}, {countryCode})."], 404);
        }
        if (string.IsNullOrWhiteSpace(planPrice.StripePriceId))
        {
            return BusinessResponse<HostedBillingResponse>.Fail([$"Plan {request.PlanCode} has no Stripe price configured."], 422);
        }

        if (string.Equals(request.ReturnContextCode, BillingConstants.OnboardingReturnContext, StringComparison.OrdinalIgnoreCase))
        {
            await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
            await billingInsertService.RecordTrialingSubscriptionAsync(user, request.PlanCode, cancellationToken);
            var onboarding = await onboardingReadService.GetOnboardingAsync(user, cancellationToken);
            await onboardingUpdateService.SaveOnboardingAsync(user, onboarding with { CurrentStepCode = "notifications" }, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var existingCustomer = await billingReadService.GetStripeCustomerIdAsync(user.UserId, cancellationToken);
        var email = await billingReadService.GetProfileEmailAsync(user.UserId, cancellationToken) ?? user.Email;
        var (successUrl, cancelUrl) = ResolveCheckoutUrls(request.ReturnContextCode);

        var input = new CheckoutSessionInput(
            user.UserId,
            email,
            existingCustomer,
            planPrice.StripePriceId!,
            request.ReturnContextCode,
            successUrl,
            cancelUrl,
            planPrice.TrialDays);

        try
        {
            return BusinessResponse<HostedBillingResponse>.Ok(await stripeProvider.CreateCheckoutSessionAsync(input, cancellationToken));
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<HostedBillingResponse>.Fail([ex.Message], 502);
        }
    }

    public async Task<BusinessResponse<HostedBillingResponse>> CreatePortalAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        var stripeCustomerId = await billingReadService.GetStripeCustomerIdAsync(user.UserId, cancellationToken);
        if (string.IsNullOrWhiteSpace(stripeCustomerId))
        {
            return BusinessResponse<HostedBillingResponse>.Fail(["No Stripe customer is linked to this account yet. Start a subscription before opening the portal."], 409);
        }

        var input = new PortalSessionInput(stripeCustomerId, _stripeOptions.PortalReturnUrl);

        try
        {
            return BusinessResponse<HostedBillingResponse>.Ok(await stripeProvider.CreatePortalSessionAsync(input, cancellationToken));
        }
        catch (ExternalProviderAppException ex)
        {
            return BusinessResponse<HostedBillingResponse>.Fail([ex.Message], 502);
        }
    }

    private (string SuccessUrl, string CancelUrl) ResolveCheckoutUrls(string returnContextCode) =>
        string.Equals(returnContextCode, BillingConstants.OnboardingReturnContext, StringComparison.OrdinalIgnoreCase)
            ? (_stripeOptions.OnboardingSuccessUrl, _stripeOptions.OnboardingCancelUrl)
            : (_stripeOptions.BillingSuccessUrl, _stripeOptions.BillingCancelUrl);
}
