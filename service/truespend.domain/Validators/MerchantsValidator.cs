using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.Validators;

public sealed class MerchantsValidator
{
    public IReadOnlyList<string> ValidateResolveMerchant(ResolveMerchantRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.Name)) errors.Add("Merchant name is required.");
        if (string.IsNullOrWhiteSpace(request.Provider)) errors.Add("Merchant provider is required.");
        return errors;
    }

    public IReadOnlyList<string> ValidateCreateVisit(CreateMerchantVisitRequest request)
    {
        var errors = new List<string>();
        if (request.MerchantId <= 0) errors.Add("Merchant id is required.");
        if (string.IsNullOrWhiteSpace(request.SelectedCategoryCode)) errors.Add("Selected category is required.");
        return errors;
    }
}
