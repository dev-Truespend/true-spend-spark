using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.Validators;

public sealed class RecommendationsValidator
{
    public const int MinSearchQueryLength = 2;

    public IReadOnlyList<string> ValidateSearchPlaces(SearchPlacesRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Query) || request.Query.Trim().Length < MinSearchQueryLength)
            errors.Add($"Search needs at least {MinSearchQueryLength} characters.");
        if (request.CenterLat is < -90m or > 90m) errors.Add("Latitude is out of range.");
        if (request.CenterLng is < -180m or > 180m) errors.Add("Longitude is out of range.");
        return errors;
    }

    public IReadOnlyList<string> ValidateNearbyMerchants(NearbyMerchantsRequest request)
    {
        var errors = new List<string>();
        if (request.CenterLat is < -90m or > 90m)
            errors.Add("Latitude is out of range.");
        if (request.CenterLng is < -180m or > 180m)
            errors.Add("Longitude is out of range.");
        if (request.RadiusMeters is <= 0)
            errors.Add("Radius must be positive.");
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
