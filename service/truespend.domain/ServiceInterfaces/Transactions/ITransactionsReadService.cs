using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.ServiceInterfaces.Transactions;

public interface ITransactionsReadService
{
    Task<IReadOnlyList<Transaction>> GetTransactionsAsync(OnboardingWorkflowUser user, TransactionListQuery query, CancellationToken cancellationToken);
    Task<TransactionDetail?> GetTransactionDetailAsync(OnboardingWorkflowUser user, int transactionId, CancellationToken cancellationToken);
    Task<TransactionRewardResult?> GetRewardResultAsync(int transactionId, CancellationToken cancellationToken);
    Task<MissedReward?> GetMissedRewardAsync(OnboardingWorkflowUser user, int transactionId, CancellationToken cancellationToken);
    Task<IReadOnlyList<MissedReward>> GetMissedRewardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<IReadOnlyList<TransactionCategory>> GetTransactionCategoriesAsync(CancellationToken cancellationToken);
}
