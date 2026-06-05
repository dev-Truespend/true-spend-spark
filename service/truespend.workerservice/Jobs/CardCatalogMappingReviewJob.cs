using TrueSpend.Domain.BusinessInterfaces.Catalog;

namespace TrueSpend.WorkerService.Jobs;

public sealed class CardCatalogMappingReviewJob(ICardCatalogMappingReviewBusiness business)
{
    public Task RunAsync(CancellationToken cancellationToken) =>
        business.RunAsync(DateTimeOffset.UtcNow, cancellationToken);
}
