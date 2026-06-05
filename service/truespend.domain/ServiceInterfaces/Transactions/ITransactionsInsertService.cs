using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.ServiceInterfaces.Transactions;

public interface ITransactionsInsertService
{
    Task<int> InsertTransactionAsync(OnboardingWorkflowUser user, CreateTransactionRequest request, int? merchantId, short? categoryId, CancellationToken cancellationToken);
    Task InsertRewardResultAsync(int transactionId, TransactionRewardResult result, CancellationToken cancellationToken);
    Task<int> InsertMissedRewardAsync(int transactionId, int betterCardId, decimal actualAmount, decimal potentialAmount, decimal missedAmount, CancellationToken cancellationToken);
    Task<PlaidTransactionUpsertResult?> UpsertPlaidTransactionAsync(OnboardingWorkflowUser user, int connectionId, PlaidTransactionData transaction, CancellationToken cancellationToken);
    Task<PlaidTransactionRemoveResult?> RemovePlaidTransactionAsync(OnboardingWorkflowUser user, string plaidTransactionId, CancellationToken cancellationToken);
}
