using Microsoft.Extensions.Logging;
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
    IEntitlementCacheInvalidatorBusiness entitlementCacheInvalidator,
    IUnitOfWork unitOfWork,
    IOptions<StripeProviderOptions> stripeOptions,
    ILogger<BillingInsertBusiness> logger,
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

        // TestFlight/QA: provision the trial locally and skip Stripe entirely. Branches before the
        // StripePriceId requirement because simulated plans need no Stripe price configured.
        if (_stripeOptions.SimulateCheckout)
        {
            return await SimulateCheckoutAsync(user, request, cancellationToken);
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

    // Simulate-checkout (TestFlight): record a trialing subscription for the chosen plan with no Stripe
    // call, advance onboarding when in that context, then return an empty Url so the client treats it as a
    // completed checkout. Feature-gating reads the same local subscription row, so the plan takes effect
    // immediately and lapses to Free when the trial ends — real behavior minus the charge.
    private async Task<BusinessResponse<HostedBillingResponse>> SimulateCheckoutAsync(
        OnboardingWorkflowUser user,
        CreateCheckoutSessionRequest request,
        CancellationToken cancellationToken)
    {
        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        await billingInsertService.RecordSimulatedTrialingSubscriptionAsync(user, request.PlanCode, cancellationToken);
        if (string.Equals(request.ReturnContextCode, BillingConstants.OnboardingReturnContext, StringComparison.OrdinalIgnoreCase))
        {
            var onboarding = await onboardingReadService.GetOnboardingAsync(user, cancellationToken);
            await onboardingUpdateService.SaveOnboardingAsync(user, onboarding with { CurrentStepCode = "notifications" }, cancellationToken);
        }
        await tx.CommitAsync(cancellationToken);

        // Post-commit: refresh the entitlement cache so the new plan is visible on the next read.
        try
        {
            await entitlementCacheInvalidator.InvalidateAsync(user.UserId, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Entitlement cache invalidation failed after simulated checkout for user {UserId}", user.UserId);
        }

        // Empty Url signals "no redirect" — the client skips the browser hand-off and refreshes entitlements.
        return BusinessResponse<HostedBillingResponse>.Ok(new HostedBillingResponse(string.Empty));
    }

    private (string SuccessUrl, string CancelUrl) ResolveCheckoutUrls(string returnContextCode) =>
        string.Equals(returnContextCode, BillingConstants.OnboardingReturnContext, StringComparison.OrdinalIgnoreCase)
            ? (_stripeOptions.OnboardingSuccessUrl, _stripeOptions.OnboardingCancelUrl)
            : (_stripeOptions.BillingSuccessUrl, _stripeOptions.BillingCancelUrl);
}
