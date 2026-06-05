using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.ServiceInterfaces.Catalog;

public interface ICatalogReadService
{
    Task<IReadOnlyList<Issuer>> GetIssuersAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<CardProduct>> GetProductsAsync(int? issuerId, string? query, CancellationToken cancellationToken);
    Task<CardProductDetailResponse?> GetProductAsync(int cardProductId, CancellationToken cancellationToken);
    Task<IReadOnlyList<Category>> GetCategoriesAsync(CancellationToken cancellationToken);
    Task<string?> GetIssuerNameAsync(int issuerId, CancellationToken cancellationToken);
}
