namespace TrueSpend.Api.ViewModels.Common;

public sealed record OnboardingResponseVm(
    string CurrentStepCode,
    bool CardConnectionPlaid,
    bool CardConnectionManual,
    bool CardConnectionSkipped,
    bool Completed);
