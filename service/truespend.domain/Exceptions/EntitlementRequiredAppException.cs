namespace TrueSpend.Domain.Exceptions;

public sealed class EntitlementRequiredAppException : AppException
{
    public string FeatureCode { get; }
    public string RequiredPlanCode { get; }

    public EntitlementRequiredAppException(string featureCode, string requiredPlanCode, string message)
        : base(message)
    {
        FeatureCode = featureCode;
        RequiredPlanCode = requiredPlanCode;
    }
}
