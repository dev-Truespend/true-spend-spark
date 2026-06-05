namespace TrueSpend.Domain.Exceptions;

public static class ExceptionMessages
{
    public const string NotFound = "Resource not found.";
    public const string Forbidden = "You do not have permission to perform this action.";
    public const string Conflict = "The request conflicts with the current state.";
    public const string ValidationFailed = "One or more validation errors occurred.";
    public const string ExternalProviderFailure = "External provider call failed.";

    public const string MerchantNotFound = "Merchant not found.";
    public const string CardNotFound = "Card not found.";
    public const string ProductNotFound = "Card product not found.";
    public const string IssuerNotFound = "Card issuer not found.";
    public const string PlanNotFound = "Billing plan not found.";
    public const string OnboardingStateMissing = "Onboarding state has not been initialized.";
    public const string CardLimitReached = "Card limit reached for current plan.";
    public const string DuplicatePrimaryCard = "Another card is already marked as primary.";
    public const string AIInsightNotFound = "AI insight not found.";
    public const string AIInsightGenerationRunNotFound = "AI insight generation run not found.";
    public const string AIInsightsNotEntitled = "AI insights require a Pro plan.";
    public const string AIInsightsPrivacyDisabled = "Personalized AI insights are disabled in privacy settings.";
    public const string InvalidAnalyticsPeriod = "Invalid analytics period code.";
}
