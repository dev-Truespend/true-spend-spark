using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Onboarding;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Api.Mappers;

public interface IOnboardingMapper
{
    UpdateOnboardingRequest ToDomain(UpdateOnboardingRequestVm request);
    OnboardingResponseVm ToResponse(OnboardingResponse domain);
}

public sealed class OnboardingMapper : IOnboardingMapper
{
    public UpdateOnboardingRequest ToDomain(UpdateOnboardingRequestVm request) =>
        new(request.CurrentStepCode, request.CardConnectionPlaid, request.CardConnectionManual, request.CardConnectionSkipped);

    public OnboardingResponseVm ToResponse(OnboardingResponse domain) =>
        new(domain.CurrentStepCode, domain.CardConnectionPlaid, domain.CardConnectionManual, domain.CardConnectionSkipped, domain.Completed);
}
