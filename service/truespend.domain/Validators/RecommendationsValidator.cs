using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.Validators;

public sealed class RecommendationsValidator
{
    public IReadOnlyList<string> ValidateNearbyMerchants(NearbyMerchantsRequest request)
    {
        var errors = new List<string>();
        if (request.SwLat is < -90m or > 90m || request.NeLat is < -90m or > 90m || request.CenterLat is < -90m or > 90m)
            errors.Add("Latitude is out of range.");
        if (request.SwLng is < -180m or > 180m || request.NeLng is < -180m or > 180m || request.CenterLng is < -180m or > 180m)
            errors.Add("Longitude is out of range.");
        if (request.NeLat < request.SwLat || request.NeLng < request.SwLng)
            errors.Add("Bounding box is inverted (north-east must be above/right of south-west).");
        return errors;
    }

    public IReadOnlyList<string> ValidateInStoreRecommendation(InStoreRecommendationRequest request)
    {
        return request.MerchantId <= 0 ? ["Merchant is required."] : [];
    }

    public IReadOnlyList<string> ValidateRefreshRecommendation(RefreshRecommendationRequest request)
    {
        return request.MerchantId <= 0 ? ["Merchant is required."] : [];
    }

    public IReadOnlyList<string> ValidateNearbyRecommendation(NearbyRecommendationRequest request)
    {
        var errors = new List<string>();
        if (request.Lat is < -90m or > 90m) errors.Add("Latitude is out of range.");
        if (request.Lng is < -180m or > 180m) errors.Add("Longitude is out of range.");
        return errors;
    }

    public IReadOnlyList<string> ValidatePlaceRecommendation(PlaceRecommendationRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Name)) errors.Add("Place name is required.");
        if (request.Lat is < -90m or > 90m) errors.Add("Latitude is out of range.");
        if (request.Lng is < -180m or > 180m) errors.Add("Longitude is out of range.");
        return errors;
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
