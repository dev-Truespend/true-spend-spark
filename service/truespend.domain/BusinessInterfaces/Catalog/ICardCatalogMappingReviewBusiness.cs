using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.BusinessInterfaces.Catalog;

public interface ICardCatalogMappingReviewBusiness
{
    Task<CardCatalogReviewResult> RunAsync(DateTimeOffset now, CancellationToken cancellationToken);
}
