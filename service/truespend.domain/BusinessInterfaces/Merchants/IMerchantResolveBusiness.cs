using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.BusinessInterfaces.Merchants;

// Shared find-or-create-by-name merchant resolution. One copy so the geo arrival pipeline (10a)
// and the foreground nearby recommendation (03) never diverge on dedup / category resolution.
public interface IMerchantResolveBusiness
{
    Task<Merchant> ResolveByNameAsync(string name, string provider, string? providerPlaceId, string? address, CancellationToken cancellationToken);
}
