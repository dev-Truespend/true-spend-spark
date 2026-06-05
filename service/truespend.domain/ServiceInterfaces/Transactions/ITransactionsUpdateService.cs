using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.ServiceInterfaces.Transactions;

public interface ITransactionsUpdateService
{
    Task UpdateTransactionAsync(OnboardingWorkflowUser user, int transactionId, UpdateTransactionRequest request, short? categoryId, CancellationToken cancellationToken);
    Task UpsertRewardResultAsync(int transactionId, TransactionRewardResult result, CancellationToken cancellationToken);
    Task<MissedRewardUpsertResult> UpsertMissedRewardAsync(int transactionId, int betterCardId, decimal actualAmount, decimal potentialAmount, decimal missedAmount, CancellationToken cancellationToken);
    Task DeleteMissedRewardAsync(int transactionId, CancellationToken cancellationToken);
    Task DismissMissedRewardAsync(int missedRewardId, CancellationToken cancellationToken);
    Task<int?> GetMissedRewardTransactionIdAsync(int missedRewardId, CancellationToken cancellationToken);
    Task<int?> ResolveMerchantIdByNameAsync(string merchantName, CancellationToken cancellationToken);
}
