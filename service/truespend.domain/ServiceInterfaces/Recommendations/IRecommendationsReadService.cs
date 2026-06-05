using TrueSpend.Domain.Models.Recommendations;

namespace TrueSpend.Domain.ServiceInterfaces.Recommendations;

public interface IRecommendationsReadService
{
    Task<Recommendation?> GetRecommendationAsync(int recommendationId, CancellationToken cancellationToken);
}
