namespace TrueSpend.Domain.Models.Onboarding;

public sealed record UpdateOnboardingRequest(string CurrentStepCode, bool CardConnectionPlaid, bool CardConnectionManual, bool CardConnectionSkipped);
