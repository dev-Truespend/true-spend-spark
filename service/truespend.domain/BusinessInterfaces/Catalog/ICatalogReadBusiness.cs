using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.BusinessInterfaces.Catalog;

public interface ICatalogReadBusiness
{
    Task<BusinessResponse<IssuersResponse>> GetIssuersAsync(CancellationToken cancellationToken);
    Task<BusinessResponse<CardProductsResponse>> GetProductsAsync(int? issuerId, string? query, CancellationToken cancellationToken);
    Task<BusinessResponse<CardProductDetailResponse>> GetProductAsync(int cardProductId, CancellationToken cancellationToken);
    Task<BusinessResponse<CategoriesResponse>> GetCategoriesAsync(CancellationToken cancellationToken);
}
