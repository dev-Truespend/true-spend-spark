namespace TrueSpend.Api.ViewModels.Onboarding;

public sealed record UpdateOnboardingRequestVm(
    string CurrentStepCode,
    bool CardConnectionPlaid,
    bool CardConnectionManual,
    bool CardConnectionSkipped);
