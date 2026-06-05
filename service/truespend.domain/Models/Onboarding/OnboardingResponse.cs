namespace TrueSpend.Domain.Models.Onboarding;

public sealed record OnboardingResponse(string CurrentStepCode, bool CardConnectionPlaid, bool CardConnectionManual, bool CardConnectionSkipped, bool Completed);
