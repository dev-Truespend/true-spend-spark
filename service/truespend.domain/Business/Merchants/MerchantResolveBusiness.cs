using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;

namespace TrueSpend.Domain.Business.Merchants;

// Find-or-create a merchant by name, resolving its category on first sight. Returns the domain
// Merchant directly (a shared collaborator like RecommendationBuilderBusiness, not an API-facing
// business). The `provider` comes from the caller's event, never a constant, so custom-detected
// merchants are not mislabeled as Foursquare.
public sealed class MerchantResolveBusiness(
    IMerchantsReadService readService,
    IMerchantsInsertService insertService) : IMerchantResolveBusiness
{
    public async Task<Merchant> ResolveByNameAsync(string name, string provider, string? providerPlaceId, string? address, CancellationToken cancellationToken)
    {
        var existing = await readService.FindByNameAsync(name, cancellationToken);
        if (existing is not null) return existing;

        var category = await readService.ResolveCategoryAsync(name, cancellationToken);
        return await insertService.SaveMerchantAsync(
            name,
            provider: provider,
            providerPlaceId: providerPlaceId,
            categoryCode: category.CategoryCode,
            isMultiCategory: category.IsMultiCategory,
            address: address,
            cancellationToken);
    }
}
