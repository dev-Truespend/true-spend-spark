using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.Validators;

public sealed class BillingValidator
{
    private static readonly HashSet<string> AllowedReturnContexts = new(StringComparer.OrdinalIgnoreCase)
    {
        BillingConstants.OnboardingReturnContext,
        BillingConstants.BillingReturnContext
    };

    public IReadOnlyList<string> ValidateCreateCheckout(CreateCheckoutSessionRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.PlanCode)) errors.Add("Plan is required.");
        if (string.IsNullOrWhiteSpace(request.PeriodCode)) errors.Add("Billing period is required.");
        if (string.IsNullOrWhiteSpace(request.ReturnContextCode))
        {
            errors.Add("Return context is required.");
        }
        else if (!AllowedReturnContexts.Contains(request.ReturnContextCode))
        {
            errors.Add("Return context must be 'billing' or 'onboarding'.");
        }
        return errors;
    }
}
