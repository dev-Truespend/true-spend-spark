using TrueSpend.Domain.Models.Catalog;

namespace TrueSpend.Domain.ServiceInterfaces.Catalog;

public interface IRewardsCcProvider
{
    Task<IReadOnlyList<RewardsCcIssuerData>> GetIssuersAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<RewardsCcCardProductData>> GetCardProductsAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<RewardsCcRewardRuleData>> GetRewardRulesAsync(string providerCardId, CancellationToken cancellationToken);
}
