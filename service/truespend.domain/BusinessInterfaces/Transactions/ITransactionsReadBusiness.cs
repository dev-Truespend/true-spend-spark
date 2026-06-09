using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Domain.BusinessInterfaces.Transactions;

public interface ITransactionsReadBusiness
{
    Task<BusinessResponse<TransactionsResponse>> GetTransactionsAsync(OnboardingWorkflowUser user, TransactionListQuery query, CancellationToken cancellationToken);
    Task<BusinessResponse<TransactionDetailResponse>> GetTransactionDetailAsync(OnboardingWorkflowUser user, int transactionId, CancellationToken cancellationToken);
    Task<BusinessResponse<TransactionRewardResultResponse>> GetRewardResultAsync(OnboardingWorkflowUser user, int transactionId, CancellationToken cancellationToken);
    Task<BusinessResponse<MissedRewardEventsResponse>> GetMissedRewardsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<TransactionCategoriesResponse>> GetCategoriesAsync(CancellationToken cancellationToken);
}
