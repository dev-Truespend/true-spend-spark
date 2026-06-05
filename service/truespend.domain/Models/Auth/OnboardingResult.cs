namespace TrueSpend.Domain.Models.Auth;

public sealed record OnboardingResult(
    string CurrentStepCode,
    bool CardConnectionPlaid,
    bool CardConnectionManual,
    bool CardConnectionSkipped,
    bool Completed);
