using TrueSpend.Domain.Models.Analytics;

namespace TrueSpend.Domain.Validators;

public sealed class AnalyticsValidator
{
    private static readonly IReadOnlySet<string> ValidPeriodCodes =
        new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "week", "month", "quarter", "year" };

    public IReadOnlyList<string> ValidatePeriodRequest(AnalyticsPeriodRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.PeriodCode))
            errors.Add("periodCode is required.");
        else if (!ValidPeriodCodes.Contains(request.PeriodCode))
            errors.Add($"periodCode must be one of: {string.Join(", ", ValidPeriodCodes)}.");
        return errors;
    }
}
