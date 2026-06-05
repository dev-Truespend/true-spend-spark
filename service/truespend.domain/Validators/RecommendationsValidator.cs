using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.Validators;

public sealed class RecommendationsValidator
{
    public IReadOnlyList<string> ValidateInStoreRecommendation(InStoreRecommendationRequest request)
    {
        return request.MerchantId <= 0 ? ["Merchant is required."] : [];
    }

    public IReadOnlyList<string> ValidateRefreshRecommendation(RefreshRecommendationRequest request)
    {
        return request.MerchantId <= 0 ? ["Merchant is required."] : [];
    }

    public IReadOnlyList<string> ValidateCategoryUpdate(UpdateRecommendationCategoryRequest request)
    {
        var errors = new List<string>();
        if (request.RecommendationId <= 0) errors.Add("Recommendation is required.");
        if (string.IsNullOrWhiteSpace(request.CategoryCode)) errors.Add("Category is required.");
        return errors;
    }

    public IReadOnlyList<string> ValidateCreateVisit(CreateMerchantVisitRequest request)
    {
        var errors = new List<string>();
        if (request.MerchantId <= 0) errors.Add("Merchant is required.");
        if (string.IsNullOrWhiteSpace(request.SelectedCategoryCode)) errors.Add("Selected category is required.");
        return errors;
    }
}
