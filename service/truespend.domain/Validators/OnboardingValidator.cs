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

public sealed class OnboardingValidator
{
    public IReadOnlyList<string> ValidateUpdateOnboarding(UpdateOnboardingRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.CurrentStepCode)) errors.Add("Current step is required.");
        return errors;
    }
}
